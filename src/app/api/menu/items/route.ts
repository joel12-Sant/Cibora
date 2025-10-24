// src/app/api/menu/items/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

type SessionUser = { id: string; role: Role; tenantId: string | null };

type Body = {
  name?: string;
  price?: number;
  active?: boolean;
  imageUrl?: string;
  description?: string;
  // Opcional: si manejas múltiples menús por tenant
  menuId?: string;
};

const ALLOWED = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF]);

export async function POST(req: Request) {
  try {
    // --- Auth & permisos ---
    const session = await auth();
    const user = (session?.user as SessionUser) ?? null;

    if (!user || !user.tenantId || !ALLOWED.has(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Body & validación básica ---
    const body = (await req.json().catch(() => ({}))) as Body;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const price = typeof body.price === "number" ? body.price : Number.NaN;
    const active = typeof body.active === "boolean" ? body.active : true;
    const imageUrl =
      typeof body.imageUrl === "string" && body.imageUrl.trim() !== ""
        ? body.imageUrl.trim()
        : undefined;
    const description =
      typeof body.description === "string" && body.description.trim() !== ""
        ? body.description.trim()
        : undefined;

    if (!name) {
      return NextResponse.json({ error: "name requerido" }, { status: 400 });
    }
    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json({ error: "price inválido" }, { status: 400 });
    }

    // --- Determinar menuId ---
    // Opción A: lo envías desde el cliente
    let menuId = body.menuId;

    // Opción B: si no viene, intentamos deducirlo:
    if (!menuId) {
      // Si tu modelo tiene un único menú por tenant,
      // puedes obtenerlo así:
      const menus = await prisma.menu.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true },
      });

      if (menus.length === 0) {
        return NextResponse.json(
          { error: "No existe un menú para este tenant" },
          { status: 400 }
        );
      }
      if (menus.length > 1) {
        // Evitamos ambigüedad si hay varios menús
        return NextResponse.json(
          {
            error:
              "Hay múltiples menús para este tenant. Envía menuId en el body.",
          },
          { status: 400 }
        );
      }
      menuId = menus[0].id;
    }

    // Seguridad: que el menú pertenezca al tenant del usuario
    const okMenu = await prisma.menu.findFirst({
      where: { id: menuId, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!okMenu) {
      return NextResponse.json({ error: "Menu inválido" }, { status: 400 });
    }

    // --- Crear item ---
    const item = await prisma.menuItem.create({
      data: {
        name,
        price,
        active,
        imageUrl,
        description,
        menuId,
      },
      select: {
        id: true,
        name: true,
        price: true,
        active: true,
        imageUrl: true,
        description: true,
        menuId: true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/menu/items error:", e);
    return NextResponse.json(
      { error: e?.message ?? "error" },
      { status: 500 }
    );
  }
}

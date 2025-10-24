// src/app/api/menu/items/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

type SessionUser = { id: string; role: Role; tenantId: string | null };

type Body = {
  name: string;
  price: number;
  active?: boolean;
  imageUrl?: string;
  description?: string;
  menuId?: string;
};

const ALLOWED = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF]);

/** Narrow: convierte unknown -> string de forma segura */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

/** Type guard para el body */
function isBody(v: unknown): v is Body {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  const validName = typeof o.name === "string" && o.name.trim().length > 0;
  const validPrice = typeof o.price === "number" && Number.isFinite(o.price);
  const validActive = o.active === undefined || typeof o.active === "boolean";
  const validImageUrl = o.imageUrl === undefined || typeof o.imageUrl === "string";
  const validDescription = o.description === undefined || typeof o.description === "string";
  const validMenuId = o.menuId === undefined || typeof o.menuId === "string";
  return validName && validPrice && validActive && validImageUrl && validDescription && validMenuId;
}

export async function POST(req: Request) {
  try {
    // --- Auth & permisos ---
    const session = await auth();
    const user = (session?.user as SessionUser | null) ?? null;

    if (!user || !user.tenantId || !ALLOWED.has(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Parse body sin any ---
    const raw = (await req.json()) as unknown;

    if (!isBody(raw)) {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const name = raw.name.trim();
    const price = raw.price;
    const active = raw.active ?? true;
    const imageUrl = raw.imageUrl?.trim() || undefined;
    const description = raw.description?.trim() || undefined;

    if (price < 0) {
      return NextResponse.json({ error: "price inválido" }, { status: 400 });
    }

    // --- menuId: del body o deducir ---
    let menuId = raw.menuId;

    if (!menuId) {
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
        return NextResponse.json(
          { error: "Hay múltiples menús; envía menuId en el body." },
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
  } catch (err: unknown) {
    // sin "any"
    const msg = getErrorMessage(err);
    console.error("POST /api/menu/items error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

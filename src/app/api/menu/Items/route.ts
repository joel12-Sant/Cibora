// src/app/api/menu/items/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { z } from "zod";

// Acepta number o string numérico para mayor tolerancia en el form
const createSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  price: z.coerce.number().int().nonnegative("Precio inválido"),
  active: z.boolean().optional(),
  imageUrl: z
    .string()
    .url("URL inválida")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  description: z
    .string()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

type SessionUser = {
  id?: string;
  role?: Role | string | null;
  tenantId?: string | null;
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = (session?.user as SessionUser) ?? null;

    // Guards básicos
    const allowed = new Set<Role>([
      Role.MERCHANT_OWNER,
      Role.MERCHANT_STAFF,
      Role.ADMIN,
    ]);

    const role = (user?.role ?? "") as Role;
    const tenantId = user?.tenantId ?? null;

    if (!user || !tenantId || !allowed.has(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validación de body (Zod)
    const json = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // Asegura que exista un Tenant válido
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });
    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant no encontrado" },
        { status: 400 }
      );
    }

    // Asegura que exista un Menu para el tenant (sin upsert, tenantId no es unique)
    let menu = await prisma.menu.findFirst({
      where: { tenantId: tenant.id },
      select: { id: true },
    });

    if (!menu) {
      menu = await prisma.menu.create({
        data: {
          tenantId: tenant.id,
          // `name` es requerido en Menu; usamos el nombre del tenant
          name: `${tenant.name} menu`,
        },
        select: { id: true },
      });
    }

    // Crear el nuevo MenuItem
    const created = await prisma.menuItem.create({
      data: {
        menuId: menu.id,
        name: data.name,
        price: data.price, // en pesos enteros (no centavos)
        active: data.active ?? true,
        imageUrl: data.imageUrl,
        description: data.description,
      },
      select: {
        id: true,
        name: true,
        price: true,
        active: true,
        imageUrl: true,
        description: true,
      },
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/menu/items] error:", err);
    return NextResponse.json(
      { error: "Error inesperado al crear el ítem" },
      { status: 500 }
    );
  }
}

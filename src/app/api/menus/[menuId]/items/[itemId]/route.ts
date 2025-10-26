import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { z } from "zod";

const ALLOWED = new Set<Role>(["MERCHANT_OWNER", "MERCHANT_STAFF", "ADMIN"] as const);

// Opcional: esquema para PATCH (actualización parcial)
const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  price: z.coerce.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
  imageUrl: z.string().trim().url().max(2048).optional().or(z.literal("").transform(() => undefined)),
  description: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
}).refine((v) => Object.keys(v).length > 0, { message: "Sin cambios" });

// Helper ownership
async function assertOwnership(tenantId: string, menuId: string): Promise<boolean> {
  const exists = await prisma.menu.findFirst({
    where: { id: menuId, tenantId },
    select: { id: true },
  });
  return Boolean(exists);
}

/** GET: opcional, devuelve el item */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ menuId: string; itemId: string }> }
) {
  const { menuId, itemId } = await ctx.params;

  const session = await auth();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.tenantId || !ALLOWED.has(user.role as Role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!(await assertOwnership(user.tenantId, menuId))) {
    return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });
  }

  const item = await prisma.menuItem.findFirst({
    where: { id: itemId, menuId },
    select: { id: true, name: true, price: true, active: true, imageUrl: true, description: true },
  });

  if (!item) return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  return NextResponse.json(item, { status: 200 });
}

/** PATCH: actualiza un item */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ menuId: string; itemId: string }> }
) {
  const { menuId, itemId } = await ctx.params;

  const session = await auth();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.tenantId || !ALLOWED.has(user.role as Role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!(await assertOwnership(user.tenantId, menuId))) {
    return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validación fallida", details: { fieldErrors: parsed.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  // Asegurar que el ítem pertenece al menú
  const exists = await prisma.menuItem.findFirst({ where: { id: itemId, menuId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });

  const updated = await prisma.menuItem.update({
    where: { id: itemId },
    data: parsed.data,
    select: { id: true },
  });

  return NextResponse.json({ id: updated.id }, { status: 200 });
}

/** DELETE: elimina un item */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ menuId: string; itemId: string }> }
) {
  const { menuId, itemId } = await ctx.params;

  const session = await auth();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.tenantId || !ALLOWED.has(user.role as Role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!(await assertOwnership(user.tenantId, menuId))) {
    return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });
  }

  // Verifica que pertenezca al menú antes de borrar
  const exists = await prisma.menuItem.findFirst({ where: { id: itemId, menuId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });

  await prisma.menuItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true }, { status: 200 });
}

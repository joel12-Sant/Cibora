import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

const ALLOWED = new Set<Role>(["MERCHANT_OWNER", "MERCHANT_STAFF", "ADMIN"] as const);

const patchItemSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(120, "Máximo 120 caracteres").optional(),
  // TIP: si posteas strings desde formularios, usa z.coerce.number() en vez de z.number()
  price: z.number().int("Debe ser entero").nonnegative("Precio inválido").optional(),
  active: z.boolean().optional(),
  imageUrl: z.string().trim().url("URL inválida").max(2048).optional(),
  description: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

function fieldError(details: Record<string, string[]> = {}) {
  return { details: { fieldErrors: details } };
}

async function assertOwnership(userTenantId: string, menuId: string) {
  const menu = await prisma.menu.findFirst({ where: { id: menuId, tenantId: userTenantId }, select: { id: true } });
  return Boolean(menu);
}

export async function PATCH(req: Request, { params }: { params: { menuId: string; itemId: string } }) {
  const session = await auth();
  const user = session?.user ?? null;

  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.tenantId || !ALLOWED.has(user.role as Role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!(await assertOwnership(user.tenantId, params.menuId))) {
    return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = patchItemSchema.safeParse(body);
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      { error: "Validación fallida", ...fieldError({ name: f.name ?? [], price: f.price ?? [], imageUrl: f.imageUrl ?? [], description: f.description ?? [] }) },
      { status: 400 }
    );
  }

  // Asegurar que el ítem pertenece a ese menú
  const exists = await prisma.menuItem.findFirst({
    where: { id: params.itemId, menuId: params.menuId },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });

  try {
    const updated = await prisma.menuItem.update({
      where: { id: params.itemId },
      data: { ...parsed.data },
      select: { id: true },
    });
    return NextResponse.json({ id: updated.id }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el ítem" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { menuId: string; itemId: string } }) {
  const session = await auth();
  const user = session?.user ?? null;

  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.tenantId || !ALLOWED.has(user.role as Role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!(await assertOwnership(user.tenantId, params.menuId))) {
    return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });
  }

  // Asegurar pertenencia
  const exists = await prisma.menuItem.findFirst({ where: { id: params.itemId, menuId: params.menuId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });

  try {
    await prisma.menuItem.delete({ where: { id: params.itemId } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar el ítem" }, { status: 500 });
  }
}

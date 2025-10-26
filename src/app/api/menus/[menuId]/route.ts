import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

const ALLOWED = new Set<Role>(["MERCHANT_OWNER", "MERCHANT_STAFF", "ADMIN"] as const);

const patchMenuSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100, "Máximo 100 caracteres").optional(),
});

function fieldError(details: Record<string, string[]> = {}) {
  return { details: { fieldErrors: details } };
}

export async function GET(_req: Request, { params }: { params: { menuId: string } }) {
  const session = await auth();
  const user = session?.user ?? null;

  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.tenantId || !ALLOWED.has(user.role as Role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const menu = await prisma.menu.findFirst({
    where: { id: params.menuId, tenantId: user.tenantId },
    select: {
      id: true,
      name: true,
      items: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, price: true, active: true, imageUrl: true, description: true },
      },
    },
  });

  if (!menu) return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });
  return NextResponse.json({ menu }, { status: 200 });
}

export async function PATCH(req: Request, { params }: { params: { menuId: string } }) {
  const session = await auth();
  const user = session?.user ?? null;

  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.tenantId || !ALLOWED.has(user.role as Role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = patchMenuSchema.safeParse(body);
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return NextResponse.json({ error: "Validación fallida", ...fieldError({ name: f.name ?? [] }) }, { status: 400 });
  }

  // Asegurar ownership
  const exists = await prisma.menu.findFirst({ where: { id: params.menuId, tenantId: user.tenantId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });

  try {
    const menu = await prisma.menu.update({
      where: { id: params.menuId },
      data: { ...(parsed.data.name ? { name: parsed.data.name } : {}) },
      select: { id: true, name: true },
    });
    return NextResponse.json({ id: menu.id, name: menu.name }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el menú" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { menuId: string } }) {
  const session = await auth();
  const user = session?.user ?? null;

  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.tenantId || !ALLOWED.has(user.role as Role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Asegurar ownership
  const menu = await prisma.menu.findFirst({ where: { id: params.menuId, tenantId: user.tenantId }, select: { id: true } });
  if (!menu) return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });

  try {
    await prisma.$transaction([
      prisma.menuItem.deleteMany({ where: { menuId: params.menuId } }),
      prisma.menu.delete({ where: { id: params.menuId } }),
    ]);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar el menú" }, { status: 500 });
  }
}

// src/app/api/menu/items/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { z } from "zod";

type SessionUser = { id: string; role: Role; tenantId: string | null };

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
  imageUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  description: z.string().max(500).optional().or(z.literal("").transform(() => undefined)),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const user = (session?.user as SessionUser) ?? null;

  const allowed = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF, Role.ADMIN]);
  if (!user || !user.tenantId || !allowed.has(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const item = await prisma.menuItem.findFirst({
    where: { id: params.id, menu: { tenantId: user.tenantId } },
    select: { id: true, active: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Si no se mandó ningún campo, considerar toggle de active como fallback:
  const updateData =
    Object.keys(data).length === 0
      ? { active: !item.active }
      : data;

  const updated = await prisma.menuItem.update({
    where: { id: params.id },
    data: updateData,
    select: { id: true, name: true, price: true, active: true, imageUrl: true, description: true },
  });

  return NextResponse.json({ item: updated }, { status: 200 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const user = (session?.user as SessionUser) ?? null;

  const allowed = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF, Role.ADMIN]);
  if (!user || !user.tenantId || !allowed.has(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // verificar pertenencia al tenant
  const owned = await prisma.menuItem.findFirst({
    where: { id: params.id, menu: { tenantId: user.tenantId } },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Hard-delete (documentado)
  await prisma.menuItem.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true }, { status: 200 });
}

// src/app/api/cart/items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const postSchema = z.object({
  tenantId: z.string().min(1),
  item: z.object({
    menuItemId: z.string().min(1),
    qty: z.number().int().positive(),
  }),
});

const putSchema = z.object({
  tenantId: z.string().min(1),
  menuItemId: z.string().min(1),
  qty: z.number().int().positive(),
});

const deleteSchema = z.object({
  tenantId: z.string().min(1),
  menuItemId: z.string().min(1),
});

// Crea/actualiza (UP-SERT) 1 item
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });

  const { tenantId, item } = parsed.data;

  const cart = await prisma.cart.upsert({
    where: { userId_tenantId_status: { userId, tenantId, status: "ACTIVE" } },
    update: {},
    create: { userId, tenantId, status: "ACTIVE" },
  });

  // Snapshot de MenuItem (si existe y activo)
  const mi = await prisma.menuItem.findFirst({
    where: { id: item.menuItemId, active: true, menu: { tenantId } },
    select: { id: true, name: true, price: true },
  });
  if (!mi) return NextResponse.json({ error: "menu_item_not_found" }, { status: 404 });

  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, menuItemId: item.menuItemId },
    select: { id: true },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { qty: item.qty, name: mi.name, price: mi.price },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        menuItemId: mi.id,
        name: mi.name,
        price: mi.price,
        qty: item.qty,
      },
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

// Ajusta cantidad exacta (set)
export async function PUT(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });

  const { tenantId, menuItemId, qty } = parsed.data;

  const cart = await prisma.cart.findFirst({
    where: { userId, tenantId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!cart) return NextResponse.json({ error: "cart_not_found" }, { status: 404 });

  const item = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, menuItemId },
    select: { id: true },
  });
  if (!item) return NextResponse.json({ error: "item_not_found" }, { status: 404 });

  await prisma.cartItem.update({
    where: { id: item.id },
    data: { qty },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

// Elimina un item
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });

  const { tenantId, menuItemId } = parsed.data;

  const cart = await prisma.cart.findFirst({
    where: { userId, tenantId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!cart) return NextResponse.json({ error: "cart_not_found" }, { status: 404 });

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id, menuItemId },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

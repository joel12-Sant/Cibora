// src/app/api/cart/items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  removeItemSchema,
  setQtySchema,
  upsertItemSchema,
  cartResponseSchema,
} from "@/lib/cart-types";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = upsertItemSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const { tenantId, item } = parsed.data;

  // Upsert del cart ACTIVO
  const cart = await prisma.cart.upsert({
    where: {
      userId_tenantId_status: { userId, tenantId, status: "ACTIVE" },
    },
    update: {},
    create: { userId, tenantId, status: "ACTIVE" },
  });

  // Snapshot del MenuItem del tenant
  const mi = await prisma.menuItem.findFirst({
    where: { id: item.menuItemId, menu: { tenantId }, active: true },
    select: { id: true, name: true, price: true },
  });
  if (!mi) return NextResponse.json({ error: "menu_item_not_found" }, { status: 404 });

  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, menuItemId: mi.id },
    select: { id: true, qty: true },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { qty: existing.qty + item.qty, name: mi.name, price: mi.price },
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

  // Devuelve carrito actualizado
  const fresh = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: { items: true },
  });

  const safe = cartResponseSchema.parse({
    items:
      fresh?.items.map((ci) => ({
        menuItemId: ci.menuItemId,
        name: ci.name,
        price: ci.price,
        qty: ci.qty,
      })) ?? [],
  });

  return NextResponse.json(safe, { status: 200 });
}

// Setear cantidad (0 => borrar)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = setQtySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const { tenantId, menuItemId, qty } = parsed.data;

  const cart = await prisma.cart.findFirst({
    where: { userId, tenantId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!cart) return NextResponse.json({ error: "cart_not_found" }, { status: 404 });

  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, menuItemId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "item_not_found" }, { status: 404 });

  if (qty === 0) {
    await prisma.cartItem.delete({ where: { id: existing.id } });
  } else {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { qty } });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

// Eliminar ítem
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = removeItemSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const { tenantId, menuItemId } = parsed.data;

  const cart = await prisma.cart.findFirst({
    where: { userId, tenantId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!cart) return NextResponse.json({ error: "cart_not_found" }, { status: 404 });

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, menuItemId } });

  return NextResponse.json({ ok: true }, { status: 200 });
}

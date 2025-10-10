// src/app/api/cart/merge/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cartResponseSchema, mergeSchema } from "@/lib/cart-types";

/**
 * POST /api/cart/merge
 * Body: { tenantId, items: [{ menuItemId, qty }] }
 * IDEMPOTENTE:
 *  - Si ya existe item en BD => qty_final = MAX(qty_server, qty_local)
 *  - Si no existe => se crea con qty_local
 *  - Snapshot name/price se actualiza con el MenuItem actual
 * Devuelve { items: [{ menuItemId, name, price, qty }] }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = mergeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const { tenantId, items } = parsed.data;

  const cart = await prisma.cart.upsert({
    where: { userId_tenantId_status: { userId, tenantId, status: "ACTIVE" } },
    update: {},
    create: { userId, tenantId, status: "ACTIVE" },
  });

  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: items.map((i) => i.menuItemId) },
      menu: { tenantId },
      active: true,
    },
    select: { id: true, name: true, price: true },
  });
  const miMap = new Map(menuItems.map((m) => [m.id, m]));

  const existing = await prisma.cartItem.findMany({
    where: { cartId: cart.id, menuItemId: { in: items.map((i) => i.menuItemId) } },
    select: { id: true, menuItemId: true, qty: true },
  });
  const existsMap = new Map(existing.map((e) => [e.menuItemId, e]));

  for (const i of items) {
    const mi = miMap.get(i.menuItemId);
    if (!mi) continue;

    const prev = existsMap.get(i.menuItemId);
    if (prev) {
      // 👇 IDEMPOTENTE: evita inflar cantidades si llamas merge varias veces
      const finalQty = Math.max(prev.qty, i.qty);
      if (finalQty !== prev.qty) {
        await prisma.cartItem.update({
          where: { id: prev.id },
          data: { qty: finalQty, name: mi.name, price: mi.price },
        });
      } else {
        // refresca snapshot por si cambió name/price
        await prisma.cartItem.update({
          where: { id: prev.id },
          data: { name: mi.name, price: mi.price },
        });
      }
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          menuItemId: mi.id,
          name: mi.name,
          price: mi.price,
          qty: i.qty,
        },
      });
    }
  }

  const fresh = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: { items: true },
  });

  const payload = {
    items:
      fresh?.items.map((ci) => ({
        menuItemId: ci.menuItemId,
        name: ci.name,
        price: ci.price,
        qty: ci.qty,
      })) ?? [],
  };

  const safe = cartResponseSchema.parse(payload);
  return NextResponse.json(safe, { status: 200 });
}

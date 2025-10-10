// src/app/api/cart/merge/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cartResponseSchema, mergeSchema } from "@/lib/cart-types";

/**
 * POST /api/cart/merge
 * Fusiona el carrito local con el carrito ACTIVO en BD para un tenant.
 * - Requiere sesión.
 * - Body: { tenantId, items: [{ menuItemId, qty }] }
 * - Reglas:
 *   - Se ignoran ítems que no pertenezcan al tenant o no estén activos.
 *   - Si el ítem ya existe en BD, se SUMA la cantidad.
 *   - Los snapshots de name/price se actualizan con los del MenuItem actual.
 * - Devuelve el carrito resultante normalizado: { items: [{ menuItemId, name, price, qty }] }
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

  // Upsert del cart ACTIVO para ese user/tenant
  const cart = await prisma.cart.upsert({
    where: {
      userId_tenantId_status: { userId, tenantId, status: "ACTIVE" },
    },
    update: {},
    create: { userId, tenantId, status: "ACTIVE" },
  });

  // Traer MenuItems válidos de ese tenant para las IDs solicitadas
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: items.map((i) => i.menuItemId) },
      menu: { tenantId },
      active: true,
    },
    select: { id: true, name: true, price: true },
  });
  const miMap = new Map(menuItems.map((m) => [m.id, m]));

  // Traer los CartItems existentes de esas IDs para sumar qty si ya existen
  const existing = await prisma.cartItem.findMany({
    where: { cartId: cart.id, menuItemId: { in: items.map((i) => i.menuItemId) } },
    select: { id: true, menuItemId: true, qty: true },
  });
  const existsMap = new Map(existing.map((e) => [e.menuItemId, e]));

  // Aplica upserts (suma cantidades, actualiza snapshots)
  for (const i of items) {
    const mi = miMap.get(i.menuItemId);
    if (!mi) continue; // ignora ítems inválidos o de otro tenant

    const prev = existsMap.get(i.menuItemId);
    if (prev) {
      await prisma.cartItem.update({
        where: { id: prev.id },
        data: { qty: prev.qty + i.qty, name: mi.name, price: mi.price },
      });
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

  // Devuelve carrito resultante
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

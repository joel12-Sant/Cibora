// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CartStatus, OrderStatus } from "@prisma/client";

/**
 * Crea una orden a partir de items del carrito local (o UI).
 * Reglas:
 *  - Requiere sesión (asocia la orden al usuario).
 *  - Verifica que todos los ítems existen, están activos y pertenecen al MISMO tenant.
 *  - Calcula total usando los precios actuales (snapshot).
 *  - Crea Order + OrderItems.
 *  - Si hay Cart.ACTIVE del usuario para ese tenant => lo marca como CONVERTED.
 *  - Respuesta: { id: string }
 */

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1, "id requerido"), // menuItemId
        qty: z.number().int().positive("qty debe ser > 0"),
      })
    )
    .min(1, "Debes incluir al menos 1 ítem"),
});

type CreateOrderInput = z.infer<typeof createOrderSchema>;

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  // Parse/validación del body
  const body: unknown = await req.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const { items } = parsed.data as CreateOrderInput;

  // Traer todos los MenuItems involucrados con su tenant
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map((i) => i.id) }, active: true },
    select: { id: true, name: true, price: true, menu: { select: { tenantId: true } } },
  });

  if (menuItems.length !== items.length) {
    return NextResponse.json({ error: "Algunos ítems no existen o no están activos." }, { status: 400 });
  }

  // Validar que todos pertenecen al mismo tenant
  const tenantId = menuItems[0].menu.tenantId;
  const uniqueTenants = new Set(menuItems.map((m) => m.menu.tenantId));
  if (uniqueTenants.size !== 1) {
    return NextResponse.json({ error: "Todos los ítems deben pertenecer al mismo restaurante." }, { status: 400 });
  }

  // Construir snapshot y total
  const byId = new Map(menuItems.map((m) => [m.id, m]));
  let total = 0;
  const orderItemsData = items.map((i) => {
    const mi = byId.get(i.id)!;
    total += mi.price * i.qty;
    return {
      itemId: mi.id,
      name: mi.name,
      price: mi.price,
      qty: i.qty,
    };
  });

  // Crear la orden + items en transacción
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        tenantId,
        userId,
        status: OrderStatus.CREATED,
        total,
        items: { create: orderItemsData },
      },
      select: { id: true },
    });

    // Marcar carrito activo como CONVERTED (si existe)
    await tx.cart.updateMany({
      where: { userId, tenantId, status: CartStatus.ACTIVE },
      data: { status: CartStatus.CONVERTED },
    });

    return created;
  });

  return NextResponse.json({ id: order.id }, { status: 200 });
}

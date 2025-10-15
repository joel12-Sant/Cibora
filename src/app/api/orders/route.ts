// src/app/api/orders/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CartStatus, OrderStatus } from "@prisma/client";

/**
 * Crea una Order a partir del carrito ACTIVE del (userId, tenantId).
 * Body: { tenantId?: string }
 * - Montos en BD: PESOS enteros (no centavos).
 * - OrderItem snapshot: { itemId, name, price, qty }.
 * - Alternativa 2: elimina CONVERTED previos (userId, tenantId) para respetar el índice único.
 * - Si no se envía tenantId y hay exactamente 1 carrito ACTIVE => se infiere.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    let tenantId = (body?.tenantId as string | undefined) ?? null;

    // Inferir tenantId si no viene y hay exactamente 1 carrito ACTIVE
    if (!tenantId) {
      const activeTenants = await prisma.cart.findMany({
        where: { userId, status: CartStatus.ACTIVE },
        select: { tenantId: true },
        distinct: ["tenantId"],
      });
      if (activeTenants.length === 1) {
        tenantId = activeTenants[0].tenantId;
      } else {
        return NextResponse.json(
          { error: "tenantId es requerido" },
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1) Carrito ACTIVE con items (snapshot desde aquí)
      const cart = await tx.cart.findFirst({
        where: { userId, tenantId, status: CartStatus.ACTIVE },
        select: {
          id: true,
          items: {
            select: {
              menuItemId: true, // CartItem.menuItemId
              name: true,
              price: true, // PESOS
              qty: true,
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new Error("No hay un carrito activo con ítems para este tenant.");
      }

      // 2) Total en PESOS
      const total = cart.items.reduce((acc, it) => acc + it.price * it.qty, 0);

      // 3) Crear ORDER (sin items aún)
      const order = await tx.order.create({
        data: {
          userId,
          tenantId: tenantId!, // ya garantizado
          status: OrderStatus.CREATED,
          total, // PESOS
        },
        select: { id: true, status: true, total: true },
      });

      // 4) Insertar ORDER ITEMS con createMany (map: menuItemId -> itemId)
      await tx.orderItem.createMany({
        data: cart.items.map((it) => ({
          orderId: order.id,
          itemId: it.menuItemId, // 👈 en OrderItem se llama itemId
          name: it.name,
          price: it.price, // PESOS
          qty: it.qty,
        })),
        skipDuplicates: false,
      });

      // 5) Eliminar carritos CONVERTED previos (evita colisión única)
      await tx.cart.deleteMany({
        where: { userId, tenantId: tenantId!, status: CartStatus.CONVERTED },
      });

      // 6) Convertir el ACTIVE actual → CONVERTED
      await tx.cart.updateMany({
        where: { userId, tenantId: tenantId!, status: CartStatus.ACTIVE },
        data: { status: CartStatus.CONVERTED },
      });

      return order;
    });

    return NextResponse.json(
      { ok: true, orderId: result.id, status: result.status, total: result.total },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/orders] error:", err?.code ?? err?.message ?? err);
    return NextResponse.json({ error: "No se pudo crear la orden" }, { status: 500 });
  }
}

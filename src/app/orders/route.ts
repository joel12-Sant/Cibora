// src/app/orders/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CartStatus, OrderStatus } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Body puede no venir o venir vacío
    const body = (await req.json().catch(() => ({}))) as { tenantId?: string };

    // tenantId opcional: si no viene y sólo hay 1 carrito ACTIVE, lo inferimos
    let tenantId: string | null = body?.tenantId ?? null;

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

    // Transacción para crear la orden, mover items y cerrar el carrito
    const result = await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: { userId, tenantId: tenantId!, status: CartStatus.ACTIVE },
        select: {
          id: true,
          items: {
            select: {
              menuItemId: true,
              name: true,
              price: true,
              qty: true,
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        // Lanzamos un error "conocido" para mapearlo a 400 más abajo
        throw new Error("No hay un carrito activo con ítems para este tenant.");
      }

      const total = cart.items.reduce((acc, it) => acc + it.price * it.qty, 0);

      const order = await tx.order.create({
        data: {
          userId,
          tenantId: tenantId!,
          status: OrderStatus.CREATED,
          total,
        },
        select: { id: true, status: true, total: true },
      });

      await tx.orderItem.createMany({
        data: cart.items.map((it) => ({
          orderId: order.id,
          itemId: it.menuItemId,
          name: it.name,
          price: it.price,
          qty: it.qty,
        })),
        skipDuplicates: false,
      });

      // Limpieza/estado del carrito
      await tx.cart.deleteMany({
        where: { userId, tenantId: tenantId!, status: CartStatus.CONVERTED },
      });

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/orders] error:", message);

    // Mapeamos errores "esperados" a 400
    if (message.includes("No hay un carrito activo")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: "No se pudo crear la orden" }, { status: 500 });
  }
}

// src/app/api/orders/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import crypto from "node:crypto";

const CreateOrderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1, "id requerido"),
        qty: z.number().int().positive("qty debe ser > 0"),
      })
    )
    .min(1, "Debes incluir al menos 1 ítem"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { items } = parsed.data;
    const ids = items.map((i) => i.id);

    // Trae los MenuItem desde DB con el tenant del menú
    const dbItems = await prisma.menuItem.findMany({
      where: { id: { in: ids }, active: true },
      select: {
        id: true,
        name: true,
        price: true,
        menu: { select: { tenantId: true } },
      },
    });

    if (dbItems.length !== ids.length) {
      return NextResponse.json(
        { error: "Algunos artículos no existen o no están activos." },
        { status: 400 }
      );
    }

    // Verifica que todos pertenezcan al mismo tenant
    const tenantId = dbItems[0].menu.tenantId;
    const mixedTenant = dbItems.some((mi) => mi.menu.tenantId !== tenantId);
    if (mixedTenant) {
      return NextResponse.json(
        { error: "Todos los artículos deben pertenecer al mismo restaurante." },
        { status: 400 }
      );
    }

    // Crea un map rápido por id para lookup de precio/nombre
    const map = new Map(dbItems.map((mi) => [mi.id, mi]));
    const orderItemsData = items.map((i) => {
      const dbi = map.get(i.id)!;
      return {
        itemId: dbi.id,
        name: dbi.name,
        price: dbi.price,
        qty: i.qty,
      };
    });

    const total = orderItemsData.reduce((acc, it) => acc + it.price * it.qty, 0);

    // Usuario (sesión o guest)
    const session = await auth().catch(() => null);
    let userId: string;

    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      // Usuario invitado efímero (para no romper el schema, tu modelo requiere userId)
      const guestEmail = `guest+${crypto.randomUUID()}@guest.local`;
      const guest = await prisma.user.create({
        data: {
          email: guestEmail,
          role: Role.CUSTOMER,
          tenantId: null,
          name: "Guest",
        },
        select: { id: true },
      });
      userId = guest.id;
    }

    // Crea la orden + items
    const order = await prisma.order.create({
      data: {
        tenantId,
        userId,
        status: "CREATED",
        total,
        items: {
          createMany: {
            data: orderItemsData,
          },
        },
      },
      select: { id: true },
    });

    // Estándar: siempre { orderId }
    return NextResponse.json({ orderId: order.id }, { status: 200 });
  } catch (err) {
    console.error("POST /api/orders error:", err);
    return NextResponse.json({ error: "order_create_failed" }, { status: 500 });
  }
}

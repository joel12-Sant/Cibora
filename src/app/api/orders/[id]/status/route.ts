// src/app/api/orders/[id]/status/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { OrderStatus, Role } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

const BodySchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

const ALLOWED_ROLES: Role[] = ["MERCHANT_OWNER", "MERCHANT_STAFF", "ADMIN"] as const;

function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const flow: Record<OrderStatus, OrderStatus[]> = {
    CREATED: ["PAID", "CANCELED"],
    PAID: ["PREPARING", "CANCELED"],
    PREPARING: ["OUT_FOR_DELIVERY", "CANCELED"],
    OUT_FOR_DELIVERY: ["DELIVERED", "CANCELED"],
    DELIVERED: [],
    CANCELED: [],
  };
  return flow[from].includes(to);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const role = session.user.role;
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const { status: nextStatus } = parsed.data;

  // Trae la orden con su tenant
  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true, tenantId: true },
  });
  if (!order) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

  // Merchant debe ser del mismo tenant (admin puede todo)
  if (role !== "ADMIN") {
    if (!session.user.tenantId || session.user.tenantId !== order.tenantId) {
      return NextResponse.json({ error: "Tenant inválido" }, { status: 403 });
    }
  }

  if (!canTransition(order.status, nextStatus)) {
    return NextResponse.json(
      { error: `Transición inválida: ${order.status} → ${nextStatus}` },
      { status: 400 },
    );
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: nextStatus },
    select: { id: true, status: true },
  });

  return NextResponse.json({ order: updated });
}

// src/app/api/orders/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { OrderStatus, Role } from "@prisma/client";

type Context = { params: { id: string } };

const ALLOWED_NEXT: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREATED]: [OrderStatus.PREPARING, OrderStatus.CANCELED],
  [OrderStatus.PREPARING]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  // Si tu flujo permite mover PAID -> PREPARING:
  [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELED],
  [OrderStatus.CANCELED]: [],
};

// ✅ evitar problema de includes() con tuples
const MERCHANT_ROLES = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF]);

export async function PATCH(
  req: NextRequest,
  { params }: Context
): Promise<NextResponse> {
  // Autenticación
  const session = await auth();
  const user = session?.user as
    | { id: string; role: Role; tenantId: string | null }
    | undefined;

  if (!user || !user.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!MERCHANT_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;

  // Parse body
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const statusStr = (payload as { status?: string })?.status;
  if (!statusStr) {
    return NextResponse.json({ error: "Missing status" }, { status: 400 });
  }

  // Validar que sea un valor del enum OrderStatus
  const status = (Object.values(OrderStatus) as string[]).includes(statusStr)
    ? (statusStr as OrderStatus)
    : undefined;

  if (!status) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }

  // Traer orden y verificar tenant
  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true, tenantId: true },
  });

  if (!order || order.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Validar transición
  const allowed = ALLOWED_NEXT[order.status] ?? [];
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `Illegal transition ${order.status} -> ${status}` },
      { status: 400 }
    );
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status },
    select: { id: true, status: true },
  });

  return NextResponse.json({ order: updated });
}

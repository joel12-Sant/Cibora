// src/app/api/orders/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { OrderStatus, Role } from "@prisma/client";

// 👇 OJO: aquí el tipo de params es Promise<{ id: string }>
type Ctx = { params: Promise<{ id: string }> };

const ALLOWED_NEXT: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREATED]: [OrderStatus.PREPARING, OrderStatus.CANCELED],
  [OrderStatus.PREPARING]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELED],
  [OrderStatus.CANCELED]: [],
};

const MERCHANT_ROLES = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF]);

export async function PATCH(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { id } = await ctx.params; // 👈 extraer params con await

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

  const status = (Object.values(OrderStatus) as string[]).includes(statusStr)
    ? (statusStr as OrderStatus)
    : undefined;

  if (!status) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true, tenantId: true },
  });

  if (!order || order.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

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

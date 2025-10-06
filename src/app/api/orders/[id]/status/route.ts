import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, OrderStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ["PREPARING", "CANCELED"],
  PAID: ["PREPARING", "CANCELED"],
  PREPARING: ["OUT_FOR_DELIVERY", "CANCELED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELED: [],
};

const BodySchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  const orderId = params.id;

  const json = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }
  const nextStatus = parsed.data.status;

  const session = await auth();
  const email = session?.user?.email ?? null;
  const role: Role | undefined = session?.user?.role; // ✅ ya tipado por la declaración
  const userTenantId = session?.user?.tenantId ?? null;

  if (!email || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isMerchant = role === "MERCHANT_OWNER" || role === "MERCHANT_STAFF" || role === "ADMIN";
  if (!isMerchant || !userTenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, tenantId: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (order.tenantId !== userTenantId) {
    return NextResponse.json({ error: "Forbidden (tenant mismatch)" }, { status: 403 });
  }

  const allowed = ALLOWED[order.status];
  if (!allowed.includes(nextStatus)) {
    return NextResponse.json({ error: `Invalid transition ${order.status} -> ${nextStatus}` }, { status: 400 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.order.update({
        where: { id: order.id },
        data: { status: nextStatus },
        select: { id: true, status: true },
      });
      return u;
    });

    return NextResponse.json({ order: updated }, { status: 200 });
  } catch (err: unknown) {                  // ✅ sin any
    const e = err as Prisma.PrismaClientKnownRequestError; // cast explícito si lo necesitas
    console.error("order status patch error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

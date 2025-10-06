// app/api/orders/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, OrderStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/db";   // ← ajusta si tu cliente está en otra ruta
import { auth } from "@/lib/auth";       // ← tu helper getServerSession(authOptions)

// Estados permitidos por estado actual
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ["PREPARING", "CANCELED"],
  PAID: ["PREPARING", "CANCELED"],
  PREPARING: ["OUT_FOR_DELIVERY", "CANCELED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELED: [],
};

// Validación del body
const BodySchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  const orderId = params.id;

  // 1) Validar payload
  const json = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const nextStatus = parsed.data.status;

  // 2) Autenticación y rol
  const session = await auth();
  const email = session?.user?.email ?? null;
  const role = (session?.user as any)?.role as Role | undefined;

  if (!email || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isMerchant =
    role === "MERCHANT_OWNER" || role === "MERCHANT_STAFF" || role === "ADMIN";

  if (!isMerchant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3) Traer usuario (para conocer tenantId) y la orden
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, tenantId: true },
  });
  if (!user?.tenantId) {
    return NextResponse.json({ error: "Forbidden (no tenant bound)" }, { status: 403 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, tenantId: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // 4) Verificar pertenencia de tenant
  if (order.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Forbidden (tenant mismatch)" }, { status: 403 });
  }

  // 5) Verificar transición válida
  const allowed = ALLOWED[order.status];
  if (!allowed.includes(nextStatus)) {
    return NextResponse.json(
      { error: `Invalid transition ${order.status} -> ${nextStatus}` },
      { status: 400 }
    );
  }

  // 6) Actualizar estado (en transacción, por si luego agregas logs)
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.order.update({
        where: { id: order.id },
        data: { status: nextStatus },
        select: { id: true, status: true },
      });

      // Si luego agregas AuditLog, aquí puedes registrar:
      // await tx.auditLog.create({ data: { ... } });

      return u;
    });

    return NextResponse.json({ order: updated }, { status: 200 });
  } catch (err) {
    const e = err as Prisma.PrismaClientKnownRequestError;
    console.error("order status patch error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

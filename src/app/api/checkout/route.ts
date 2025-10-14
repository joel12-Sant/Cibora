export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string };
    if (!orderId) {
      return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, tenantId: true, status: true, total: true },
    });

    if (!order) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    if (order.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const amountCents = order.total >= 1000 ? order.total : Math.round(order.total * 100);

    if (amountCents < 1000) {
      return NextResponse.json(
        { error: "El monto mínimo de pago es $10.00 MXN. Ajusta tu carrito." },
        { status: 400 },
      );
    }

    const stripe = getStripe();

    const existing = await prisma.payment.findFirst({
      where: { orderId: order.id, provider: "stripe" },
      select: { id: true, intentId: true, status: true },
    });

    let intent;
    if (existing?.intentId) {
      intent = await stripe.paymentIntents.update(existing.intentId, {
        amount: amountCents,
        metadata: { order_id: order.id, tenant_id: order.tenantId ?? "" },
      });
    } else {
      intent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "mxn",
        metadata: { order_id: order.id, tenant_id: order.tenantId ?? "" },
        automatic_payment_methods: { enabled: true },
      });

      await prisma.payment.create({
        data: { orderId: order.id, provider: "stripe", status: "PENDING", intentId: intent.id },
      });
    }
    if (existing) {
      await prisma.payment.update({
        where: { id: existing.id },
        data: { intentId: intent.id, status: existing.status === "SUCCEEDED" ? "SUCCEEDED" : "PENDING" },
      });
    }

    return NextResponse.json({ clientSecret: intent.client_secret });
  } catch (e) {
    console.error("checkout error:", e);
    return NextResponse.json({ error: "Error al preparar el pago" }, { status: 500 });
  }
}

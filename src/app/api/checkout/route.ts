export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { toStripeAmount } from "@/lib/money";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await req.json();

    // 1) Orden
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2) Items por separado
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: order.id },
      select: { price: true, qty: true },
    });

    const computedTotal = orderItems.reduce((acc, it) => acc + it.price * it.qty, 0);

    // 3) Corrige total si difiere
    const updatedOrder =
      order.total === computedTotal
        ? order
        : await prisma.order.update({
            where: { id: order.id },
            data: { total: computedTotal },
          });

    // 4) Centavos
    const amountCents = toStripeAmount(updatedOrder.total);

    // 5) Payment existente (por proveedor stripe)
    const payment = await prisma.payment.findFirst({
      where: { orderId: updatedOrder.id, provider: "stripe" },
    });

    const stripe = await getStripe();
    let intentId: string | null = null;

    if (payment?.intentId) {
      // Update PI
      await stripe.paymentIntents.update(payment.intentId, {
        amount: amountCents,
        metadata: {
          order_id: updatedOrder.id,
          tenant_id: updatedOrder.tenantId ?? "",
        },
      });
      intentId = payment.intentId;
    } else {
      // Create PI
      const created = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "mxn",
        automatic_payment_methods: { enabled: true },
        metadata: {
          order_id: updatedOrder.id,
          tenant_id: updatedOrder.tenantId ?? "",
        },
      });
      intentId = created.id;

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { intentId },
        });
      } else {
        await prisma.payment.create({
          data: {
            provider: "stripe",
            orderId: updatedOrder.id,
            intentId,
            status: "PENDING",
          },
        });
      }
    }

    // 6) Recupera clientSecret
    const current = await stripe.paymentIntents.retrieve(intentId!);

    return NextResponse.json({
      ok: true,
      orderId: updatedOrder.id,
      intentId,
      amount: updatedOrder.total,   // pesos
      amountCents,                  // centavos
      clientSecret: current.client_secret,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Checkout error";
    console.error("[/api/checkout] error:", message);
    return NextResponse.json({ error: "Checkout error" }, { status: 500 });
  }
}

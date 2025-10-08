// app/api/webhooks/payments/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const stripe = getStripe();

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    // ⚠️ cuerpo crudo para verificar firma del webhook
    const raw = await req.text();
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("stripe webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as { id: string; metadata?: Record<string, string> };
        const orderId = pi.metadata?.order_id;
        if (!orderId) break;

        // Idempotente: si ya está SUCCEEDED, no hacemos nada
        const payment = await prisma.payment.findFirst({
          where: { intentId: pi.id, provider: "stripe" },
          select: { id: true, status: true, orderId: true },
        });

        if (payment?.status === "SUCCEEDED") break;

        await prisma.$transaction(async (tx) => {
          if (payment) {
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: "SUCCEEDED", extRef: pi.id },
            });
          } else {
            await tx.payment.create({
              data: {
                orderId,
                provider: "stripe",
                status: "SUCCEEDED",
                intentId: pi.id,
                extRef: pi.id,
              },
            });
          }

          // Marca la orden como pagada (si ya lo está, no rompe)
          await tx.order.update({
            where: { id: orderId },
            data: { status: "PAID" },
          });
        });
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as { id: string; last_payment_error?: { code?: string } };
        const payment = await prisma.payment.findFirst({
          where: { intentId: pi.id, provider: "stripe" },
          select: { id: true },
        });
        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "FAILED", extRef: pi.last_payment_error?.code ?? "failed" },
          });
        }
        break;
      }

      default:
        // otros eventos: ignorar
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("webhook handler error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

// src/app/api/webhooks/payments/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { toStripeAmount } from "@/lib/money";
import type Stripe from "stripe";

const PROVIDER = "stripe";

export async function POST(req: Request) {
  const stripe = await getStripe();

  const hdrs = await headers();
  const sig = hdrs.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[webhook] missing signature or secret");
    return new NextResponse("Bad Request", { status: 400 });
  }

  const buf = await req.arrayBuffer();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      Buffer.from(buf),
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[webhook] invalid signature:", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (
    event.type === "payment_intent.succeeded" ||
    event.type === "payment_intent.payment_failed" ||
    event.type === "payment_intent.processing" ||
    event.type === "payment_intent.canceled" ||
    event.type === "payment_intent.requires_action"
  ) {
    const pi = event.data.object as Stripe.PaymentIntent;
    const orderId = (pi.metadata?.order_id as string | undefined) ?? undefined;

    if (!orderId) {
      console.warn("[webhook] No order_id in metadata");
      return NextResponse.json({ ok: true });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId },
    });
    if (!order) {
      console.warn("[webhook] Order not found:", orderId);
      return NextResponse.json({ ok: true });
    }

    const expectedCents = toStripeAmount(order.total);
    const piAmount: number | undefined = typeof pi.amount === "number" ? pi.amount : undefined;

    if (piAmount !== undefined && piAmount !== expectedCents) {
      console.error("[webhook] PI amount mismatch", {
        orderId,
        expectedCents,
        piAmount,
      });
      await prisma.payment.updateMany({
        where: { orderId, provider: PROVIDER },
        data: {
          extRef: `mismatch:${piAmount}->${expectedCents}`,
        },
      });
    }

    let payment = await prisma.payment.findFirst({
      where: { orderId, provider: PROVIDER },
    });

    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          orderId,
          provider: PROVIDER,
          intentId: pi.id ?? null,
          status: "PENDING",
          extRef: (pi.latest_charge as string) ?? null,
        },
      });
    } else if (!payment.intentId && pi.id) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { intentId: pi.id },
      });
    }

    const statusFromEvent:
      | "SUCCEEDED"
      | "FAILED"
      | "PROCESSING"
      | "CANCELED"
      | "REQUIRES_ACTION" =
      event.type === "payment_intent.succeeded"
        ? "SUCCEEDED"
        : event.type === "payment_intent.payment_failed"
        ? "FAILED"
        : event.type === "payment_intent.processing"
        ? "PROCESSING"
        : event.type === "payment_intent.canceled"
        ? "CANCELED"
        : "REQUIRES_ACTION";

    if (statusFromEvent === "SUCCEEDED") {
      if (order.status !== "PAID") {
        await prisma.$transaction([
          prisma.payment.updateMany({
            where: { orderId, provider: PROVIDER },
            data: {
              status: "SUCCEEDED",
              intentId: pi.id ?? undefined,
              extRef: (pi.latest_charge as string) ?? undefined,
            },
          }),
          prisma.order.update({
            where: { id: orderId },
            data: { status: "PAID" },
          }),
        ]);
      } else {
        await prisma.payment.updateMany({
          where: { orderId, provider: PROVIDER },
          data: {
            status: "SUCCEEDED",
            intentId: pi.id ?? undefined,
            extRef: (pi.latest_charge as string) ?? undefined,
          },
        });
      }
    } else {
      await prisma.payment.updateMany({
        where: { orderId, provider: PROVIDER },
        data: {
          status: statusFromEvent,
          intentId: pi.id ?? undefined,
          extRef: (pi.latest_charge as string) ?? undefined,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}

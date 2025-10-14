export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";
import { CartStatus, OrderStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  const stripe = getStripe();

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const raw = await req.text();
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const intentId = pi.id;
        const orderId =
          typeof pi.metadata?.order_id === "string" ? pi.metadata.order_id : "";

        if (!orderId) {
          return NextResponse.json({ received: true, note: "missing_order_id" });
        }

        const already = await prisma.payment.findFirst({
          where: { provider: "stripe", intentId, status: "SUCCEEDED" },
          select: { id: true },
        });
        if (already) {
          return NextResponse.json({ received: true, note: "already_processed" });
        }

        await prisma.$transaction(async (tx) => {
          const prev = await tx.payment.findFirst({
            where: { provider: "stripe", intentId },
            select: { id: true },
          });

          if (prev) {
            await tx.payment.update({
              where: { id: prev.id },
              data: { status: "SUCCEEDED", extRef: event.id },
            });
          } else {
            await tx.payment.create({
              data: {
                orderId,
                provider: "stripe",
                status: "SUCCEEDED",
                intentId,
                extRef: event.id,
              },
            });
          }

          const order = await tx.order.findUnique({
            where: { id: orderId },
            select: { id: true, status: true, userId: true, tenantId: true },
          });
          if (!order) return;

          if (order.status !== OrderStatus.PAID) {
            await tx.order.update({
              where: { id: order.id },
              data: { status: OrderStatus.PAID },
            });
          }

          try {
            const cart = await tx.cart.findFirst({
              where: {
                userId: order.userId,
                tenantId: order.tenantId,
                status: { in: [CartStatus.ACTIVE, CartStatus.CONVERTED] },
              },
              orderBy: { updatedAt: "desc" },
              select: { id: true, status: true },
            });

            if (cart && cart.status !== CartStatus.CONVERTED) {
              await tx.cart.update({
                where: { id: cart.id },
                data: { status: CartStatus.CONVERTED },
              });
            }
          } catch {
          }
        });

        return NextResponse.json({ received: true });
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const intentId = pi.id;

        const prev = await prisma.payment.findFirst({
          where: { provider: "stripe", intentId },
          select: { id: true },
        });

        if (prev) {
          await prisma.payment.update({
            where: { id: prev.id },
            data: { status: "FAILED", extRef: event.id },
          });
        }
        return NextResponse.json({ received: true });
      }

      default:
        return NextResponse.json({ received: true, ignored: event.type });
    }
  } catch {
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

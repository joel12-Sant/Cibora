import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs"; // usar Node runtime
export const dynamic = "force-dynamic";

// Lee raw body (Stripe exige payload sin parsear JSON)
async function readRawBody(req: Request): Promise<string> {
  return await req.text();
}

export async function POST(req: Request) {
  const stripe = getStripe();

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });

  let event: Stripe.Event;
  try {
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const intentId = intent.id;

        // Idempotencia: si ya marcamos succeeded, no repetir
        const payment = await prisma.payment.findFirst({
          where: { intentId, provider: "stripe" },
          select: { id: true, status: true, orderId: true },
        });

        if (!payment) {
          // No tenemos registro (raro): creamos uno mínimo para trazabilidad
          console.warn("Payment not found for intent; creating placeholder");
          await prisma.payment.create({
            data: {
              provider: "stripe",
              status: "succeeded",
              intentId: intentId,
              order: {
                // Si no tenemos el orderId desde metadata, no podemos vincularlo.
                // Stripe: metadata.order_id lo guardamos en el intent
                connect: { id: String(intent.metadata?.order_id ?? "") },
              },
            },
          });
        } else if (payment.status !== "succeeded") {
          await prisma.$transaction([
            prisma.payment.update({
              where: { id: payment.id },
              data: { status: "succeeded", extRef: event.id },
            }),
            prisma.order.update({
              where: { id: payment.orderId },
              data: { status: "PAID" },
            }),
          ]);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const intentId = intent.id;
        const payment = await prisma.payment.findFirst({
          where: { intentId, provider: "stripe" },
          select: { id: true },
        });
        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "failed", extRef: event.id },
          });
        }
        break;
      }

      default:
        // Otros eventos: registrar si lo deseas
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook handler error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

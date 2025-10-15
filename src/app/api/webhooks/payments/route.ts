// src/app/api/webhooks/payments/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { toStripeAmount } from "@/lib/money";

const PROVIDER = "stripe";

export async function POST(req: Request) {
  const stripe = await getStripe();

  // 👇 headers() es async en tu proyecto
  const hdrs = await headers();
  const sig = hdrs.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[webhook] missing signature or secret");
    return new NextResponse("Bad Request", { status: 400 });
    }

  // Leer cuerpo crudo para validar firma
  const buf = await req.arrayBuffer();

  let event: any;
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

  // Procesamos PI events (succeeded/failed/processing/etc.)
  if (
    event.type === "payment_intent.succeeded" ||
    event.type === "payment_intent.payment_failed" ||
    event.type === "payment_intent.processing" ||
    event.type === "payment_intent.canceled" ||
    event.type === "payment_intent.requires_action"
  ) {
    const pi = event.data.object as any; // Stripe.PaymentIntent (evitamos importar tipos)
    const orderId = pi?.metadata?.order_id as string | undefined;

    if (!orderId) {
      console.warn("[webhook] No order_id in metadata");
      return NextResponse.json({ ok: true });
    }

    // Traer orden (fuente de verdad del total en PESOS)
    const order = await prisma.order.findFirst({
      where: { id: orderId },
    });

    if (!order) {
      console.warn("[webhook] Order not found:", orderId);
      return NextResponse.json({ ok: true });
    }

    // Validar monto (centavos)
    const expectedCents = toStripeAmount(order.total);
    const piAmount: number | undefined =
      typeof pi?.amount === "number" ? pi.amount : undefined;

    if (piAmount !== undefined && piAmount !== expectedCents) {
      // No abortamos para no colgar pagos; dejamos traza en Payment.extRef
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

    // Resolver/crear registro Payment por seguridad (idempotente)
    let payment = await prisma.payment.findFirst({
      where: { orderId, provider: PROVIDER },
    });

    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          orderId,
          provider: PROVIDER,
          intentId: pi?.id ?? null,
          status: "PENDING",
          extRef: pi?.latest_charge ?? null,
        },
      });
    } else if (!payment.intentId && pi?.id) {
      // Rellenar intentId si faltaba
      await prisma.payment.update({
        where: { id: payment.id },
        data: { intentId: pi.id },
      });
    }

    // Mapear estado
    const statusFromEvent =
      event.type === "payment_intent.succeeded"
        ? "SUCCEEDED"
        : event.type === "payment_intent.payment_failed"
        ? "FAILED"
        : event.type === "payment_intent.processing"
        ? "PROCESSING"
        : event.type === "payment_intent.canceled"
        ? "CANCELED"
        : "REQUIRES_ACTION";

    // Idempotencia: solo mover a PAID si aún no está
    if (statusFromEvent === "SUCCEEDED") {
      if (order.status !== "PAID") {
        await prisma.$transaction([
          prisma.payment.updateMany({
            where: { orderId, provider: PROVIDER },
            data: {
              status: "SUCCEEDED",
              intentId: pi?.id ?? undefined,
              extRef: pi?.latest_charge ?? undefined,
            },
          }),
          prisma.order.update({
            where: { id: orderId },
            data: { status: "PAID" },
          }),
        ]);
      } else {
        // Ya estaba PAID: actualizamos payment por consistencia
        await prisma.payment.updateMany({
          where: { orderId, provider: PROVIDER },
          data: {
            status: "SUCCEEDED",
            intentId: pi?.id ?? undefined,
            extRef: pi?.latest_charge ?? undefined,
          },
        });
      }
    } else {
      // Otros estados: registra el estado del payment (no cambiamos Order aquí)
      await prisma.payment.updateMany({
        where: { orderId, provider: PROVIDER },
        data: {
          status: statusFromEvent,
          intentId: pi?.id ?? undefined,
          extRef: pi?.latest_charge ?? undefined,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}

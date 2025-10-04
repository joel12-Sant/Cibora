import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
const stripe = getStripe();


export const runtime = "nodejs"; // obligatorio para Stripe SDK en App Router
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  orderId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { orderId } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        total: true,
        tenantId: true,
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status !== "CREATED") {
      return NextResponse.json({ error: `Invalid status ${order.status}` }, { status: 400 });
    }
    if (order.total <= 0) {
      return NextResponse.json({ error: "Order total must be > 0" }, { status: 400 });
    }

    const stripe = getStripe();

    // ¿Ya existe un PaymentIntent previo? (reintentos)
    const existing = await prisma.payment.findFirst({
      where: { orderId: order.id, provider: "stripe" },
      select: { id: true, intentId: true, status: true },
    });

    let intent;
    if (existing?.intentId) {
      // Actualiza montos si hiciste cambios de último minuto
      intent = await stripe.paymentIntents.update(existing.intentId, {
        amount: order.total * 100, // pesos → centavos
        currency: "mxn",
        metadata: { order_id: order.id, tenant_id: order.tenantId },
        payment_method_types: ["card"], 
      });
    } else {
      intent = await stripe.paymentIntents.create({
        amount: order.total * 100, // pesos → centavos
        currency: "mxn",
        metadata: { order_id: order.id, tenant_id: order.tenantId },
        // Opcional: automatic_payment_methods
        payment_method_types: ["card"], 
      });

      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "stripe",
          status: "created",
          intentId: intent.id,
        },
      });
    }

    return NextResponse.json({ clientSecret: intent.client_secret }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

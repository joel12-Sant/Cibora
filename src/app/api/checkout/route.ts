// app/api/checkout/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const stripe = getStripe();

  try {
    const session = await auth();
    const email = session?.user?.email ?? null;
    const userId = session?.user?.id ?? null;
    if (!email || !userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { orderId } = await req.json().catch(() => ({} as { orderId?: string }));
    if (!orderId) return NextResponse.json({ error: "orderId requerido" }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, tenantId: true, status: true, total: true }
    });

    if (!order) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    if (order.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (order.total <= 0) return NextResponse.json({ error: "Total inválido" }, { status: 400 });
    if (order.status !== "CREATED" && order.status !== "PAID") {
      return NextResponse.json({ error: `Estado no pagable: ${order.status}` }, { status: 409 });
    }

    // ¿Ya existe un Payment para Stripe?
    const existing = await prisma.payment.findFirst({
      where: { orderId: order.id, provider: "stripe" },
      select: { id: true, intentId: true, status: true }
    });

    let intent;
    if (existing?.intentId) {
      // ✅ solo campos actualizables
      intent = await stripe.paymentIntents.update(existing.intentId, {
        amount: order.total,
        metadata: { order_id: order.id, tenant_id: order.tenantId },
      });
    } else {
      // ✅ crear con APM y currency
      intent = await stripe.paymentIntents.create({
        amount: order.total,
        currency: "mxn",
        metadata: { order_id: order.id, tenant_id: order.tenantId },
        automatic_payment_methods: { enabled: true },
      });
    }

    // Idempotente: upsert del Payment por (orderId, provider)
    await prisma.payment.upsert({
      where: {
        // necesitas un unique compuesto en Prisma para esto si quieres máxima garantía:
        // @@unique([orderId, provider])
        // si no lo tienes aún, usa un where por id cuando exista y fallback a create.
        id: existing?.id ?? "______fallback______" // truco: si no existe, forzamos create
      },
      create: {
        orderId: order.id,
        provider: "stripe",
        status: "PENDING",
        intentId: intent.id
      },
      update: {
        intentId: intent.id,
        status: existing?.status === "SUCCEEDED" ? "SUCCEEDED" : "PENDING"
      }
    }).catch(async () => {
      // si no tienes el índice único, hacemos create/update manual
      if (existing) {
        await prisma.payment.update({
          where: { id: existing.id },
          data: { intentId: intent.id, status: existing.status === "SUCCEEDED" ? "SUCCEEDED" : "PENDING" }
        });
      } else {
        await prisma.payment.create({
          data: { orderId: order.id, provider: "stripe", status: "PENDING", intentId: intent.id }
        });
      }
    });

    return NextResponse.json({ clientSecret: intent.client_secret });
  } catch (e) {
    console.error("checkout error:", e);
    return NextResponse.json({ error: "Error al preparar el pago" }, { status: 500 });
  }
}

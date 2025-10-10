// src/app/api/orders/[id]/sync/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { OrderStatus } from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 1) Buscar el registro de Payment asociado a la orden
    const payment = await prisma.payment.findFirst({
      where: { orderId: id, provider: "stripe" },
      select: { id: true, status: true, intentId: true },
    });

    if (!payment?.intentId) {
      // Nada que sincronizar todavía
      return NextResponse.json({ ok: true, updated: false, reason: "no_intent" });
    }

    // 2) Consultar el PaymentIntent en Stripe
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(payment.intentId);

    // Si aún no está pagado en Stripe, no cambies nada
    if (pi.status !== "succeeded") {
      return NextResponse.json({ ok: true, updated: false, piStatus: pi.status });
    }

    // 3) Idempotencia real: solo actualizar si hay cambios
    type SyncResult = { didChange: boolean; status: OrderStatus | null };

    const result = await prisma.$transaction<SyncResult>(async (tx) => {
      let didChange = false;

      // 3.1) Actualiza Payment si no estaba en SUCCEEDED
      if (payment.status !== "SUCCEEDED") {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "SUCCEEDED", extRef: pi.id },
        });
        didChange = true;
      }

      // 3.2) Lee el estado actual de la orden
      const current = await tx.order.findUnique({
        where: { id },
        select: { status: true },
      });

      if (!current) return { didChange, status: null };

      // 3.3) Solo actualizar si aún no es PAID
      if (current.status !== OrderStatus.PAID) {
        await tx.order.update({
          where: { id },
          data: { status: OrderStatus.PAID },
        });
        didChange = true;
        return { didChange, status: OrderStatus.PAID };
      }

      return { didChange, status: OrderStatus.PAID };
    });

    return NextResponse.json({
      ok: true,
      updated: result.didChange,
      status: result.status ?? "UNKNOWN",
    });
  } catch (err) {
    console.error("orders/sync error:", err);
    return NextResponse.json({ ok: false, error: "sync_failed" }, { status: 500 });
  }
}

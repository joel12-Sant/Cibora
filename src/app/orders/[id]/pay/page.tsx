// src/app/orders/[id]/pay/page.tsx
import { prisma } from "@/lib/db";
import PayClient from "./pay-client";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic"; // evita cache en flujo sensible (pago)

export default async function PayPage({ params }: Props) {
  const { id } = await params;

  // Requiere sesión para pagar
  const session = await auth();
  if (!session) {
    redirect(`/auth/signin?callbackUrl=/orders/${id}/pay`);
  }

  // Validar orden
  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true, total: true, tenantId: true },
  });

  if (!order) {
    return <main className="p-6">Orden no encontrada.</main>;
  }
  if (order.status !== "CREATED") {
    return <main className="p-6">Esta orden no está disponible para pago: {order.status}</main>;
  }

  // Construye base URL y reenvía cookie de sesión al endpoint
  const h = await headers(); // Next 15: es Promise
  const host = h.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const base = process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`;
  const cookie = h.get("cookie") ?? "";

  const res = await fetch(`${base}/api/checkout`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie, // reenviamos la cookie de sesión al handler
    },
    body: JSON.stringify({ orderId: id }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return <main className="p-6">No se pudo iniciar el pago: {errText || res.statusText}</main>;
  }

  const { clientSecret } = (await res.json()) as { clientSecret: string };

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Pagar orden</h1>
      <PayClient clientSecret={clientSecret} orderId={id} />
    </main>
  );
}

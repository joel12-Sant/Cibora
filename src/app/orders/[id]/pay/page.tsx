import { prisma } from "@/lib/db";
import PayClient from "./pay-client";
import { headers } from "next/headers";

type Props = { params: Promise<{ id: string }> };

export default async function PayPage({ params }: Props) {
  const { id } = await params;

  // Validamos que la orden exista y esté en CREATED
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

  // Llamamos a /api/checkout desde el servidor para obtener el clientSecret
  const h = await headers();
  const host = h.get("host")!;
  const protocol = host.includes("localhost") ? "http" : "https";
  const base = process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`;

  const res = await fetch(`${base}/api/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderId: id }),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    return <main className="p-6">No se pudo iniciar el pago: {err}</main>;
  }

  const { clientSecret } = (await res.json()) as { clientSecret: string };

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Pagar orden</h1>
      <PayClient clientSecret={clientSecret} orderId={id} />
    </main>
  );
}

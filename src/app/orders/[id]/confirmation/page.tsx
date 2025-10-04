import Link from "next/link";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export default async function ConfirmationPage({ params }: Props) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      total: true,
      tenant: { select: { name: true } },
      createdAt: true,
    },
  });

  if (!order) {
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Orden no encontrada</h1>
        <Link href="/restaurants" className="underline">← Volver al catálogo</Link>
      </main>
    );
  }

  const paid = order.status === "PAID";

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Confirmación de orden</h1>
      <div className="rounded-xl border p-4 space-y-1">
        <div><span className="opacity-70">ID:</span> {order.id}</div>
        <div><span className="opacity-70">Restaurante:</span> {order.tenant?.name ?? "—"}</div>
        <div><span className="opacity-70">Fecha:</span> {order.createdAt.toLocaleString()}</div>
        <div><span className="opacity-70">Total:</span> ${order.total}</div>
        <div>
          <span className="opacity-70">Estatus:</span>{" "}
          <span className={paid ? "text-green-500" : "text-yellow-500"}>
            {order.status}
          </span>
        </div>
      </div>
      <Link href="/restaurants" className="underline">← Volver al catálogo</Link>
    </main>
  );
}

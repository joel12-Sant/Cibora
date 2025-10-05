import { prisma } from "@/lib/db";
import { OrderStatus } from "@prisma/client"; // <-- importa el enum
import Link from "next/link";

export default async function ConfirmationPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,        // OrderStatus
      total: true,
      tenant: { select: { name: true } },
      items: { select: { name: true, qty: true, price: true } },
    },
  });

  if (!order) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-xl font-semibold">Orden no encontrada</h1>
        <Link href="/restaurants" className="underline mt-4 inline-block">
          Ir a restaurantes
        </Link>
      </main>
    );
  }

  // ---- Estados derivados
const IN_PROGRESS: ReadonlyArray<OrderStatus> = [
  OrderStatus.CREATED,
  OrderStatus.PREPARING,
  OrderStatus.OUT_FOR_DELIVERY,
];

const isPaid = order.status === OrderStatus.PAID;
const isCanceled = order.status === OrderStatus.CANCELED;
const isDelivered = order.status === OrderStatus.DELIVERED;
const inProgress = IN_PROGRESS.includes(order.status);

  // badge de color según estado
  const badgeClass = isPaid
    ? "text-green-600"
    : isCanceled
    ? "text-red-600"
    : isDelivered
    ? "text-emerald-600"
    : "opacity-80";

  // etiqueta legible
  const label: Record<OrderStatus, string> = {
    [OrderStatus.CREATED]: "Creada",
    [OrderStatus.PAID]: "Pagada",
    [OrderStatus.PREPARING]: "Preparando",
    [OrderStatus.OUT_FOR_DELIVERY]: "En reparto",
    [OrderStatus.DELIVERED]: "Entregada",
    [OrderStatus.CANCELED]: "Cancelada",
  };

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Confirmación de pago</h1>
      <p className="opacity-80">Orden #{order.id} — {order.tenant.name}</p>

      <p className={`font-medium ${badgeClass}`}>
        Estado: {label[order.status]}
      </p>

      <div className="rounded-xl border">
        <ul className="divide-y">
          {order.items.map((i, idx) => (
            <li key={idx} className="flex items-center justify-between p-3">
              <span>{i.name} × {i.qty}</span>
              <span>${i.price * i.qty} MXN</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t p-3 font-medium">
          <span>Total</span>
          <span>${order.total} MXN</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/restaurants" className="rounded border px-3 py-1.5 hover:bg-white/5">
          Seguir explorando
        </Link>
        {isPaid && inProgress && (
          <span className="text-sm opacity-80 self-center">
            Tu pedido está en proceso…
          </span>
        )}
      </div>
    </main>
  );
}

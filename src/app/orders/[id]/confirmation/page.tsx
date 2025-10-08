// app/orders/[id]/confirmation/page.tsx
import { prisma } from "@/lib/db";
import { OrderStatus } from "@prisma/client";
import StatusBadge from "@/components/StatusBadge";
import ClientStatusRefresher from "./refresher";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic"; // siempre leer estado real

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export default async function ConfirmationPage({ params }: Params) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      total: true,
      createdAt: true,
      items: { select: { name: true, price: true, qty: true } },
    },
  });

  if (!order) {
    return <main className="p-6">Orden no encontrada.</main>;
  }

  const needsRefresh =
    order.status === OrderStatus.CREATED || order.status === OrderStatus.PAID;

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Confirmación de pedido</h1>
        <p className="text-sm text-gray-500">#{order.id.slice(0, 8)} • {order.createdAt.toLocaleString()}</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Estado:</span>
          <StatusBadge status={order.status} />
        </div>
      </header>

      <section className="rounded-xl border p-4">
        <h2 className="font-medium mb-2">Resumen</h2>
        <ul className="text-sm space-y-1">
          {order.items.map((it, i) => (
            <li key={i}>
              {it.qty} × {it.name} — {mxn.format((it.price * it.qty) / 100)}
            </li>
          ))}
        </ul>
        <p className="mt-3 font-semibold">Total: {mxn.format(order.total / 100)}</p>
      </section>

      {needsRefresh ? (
        <p className="text-sm text-gray-500">
          Estamos confirmando tu pago… esta página se actualizará automáticamente.
        </p>
      ) : (
        <p className="text-sm text-green-700">
          ¡Listo! Tu pago fue confirmado. El restaurante está procesando tu pedido.
        </p>
      )}

      {needsRefresh && <ClientStatusRefresher orderId={order.id} />}
    </main>
  );
}

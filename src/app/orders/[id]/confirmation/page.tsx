import { prisma } from "@/lib/db";
import { formatMXN } from "@/lib/money";
import ClientStatusRefresher from "./refresher";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({ params }: Props) {
  const { id } = await params;

  // Trae la orden con items (solo lo necesario)
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      total: true,
      createdAt: true,
      items: { select: { id: true, name: true, price: true, qty: true } },
    },
  });

  if (!order) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-semibold mb-2">Pedido no encontrado</h1>
        <p className="opacity-70">Verifica el enlace o regresa a la tienda.</p>
      </main>
    );
  }

  // Trae el estado del pago (Stripe) asociado a la orden
  const payment = await prisma.payment.findFirst({
    where: { orderId: order.id, provider: "stripe" },
    select: { id: true, status: true, intentId: true, createdAt: true },
  });

  // Solo refrescamos si AÚN no está pagada en DB y tampoco el pago está SUCCEEDED
  const needsRefresh = !(
    order.status === "PAID" || (payment && payment.status === "SUCCEEDED")
  );

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Confirmación de pedido</h1>
        <p className="text-sm opacity-70">
          Pedido #{order.id.slice(0, 8)} • {new Date(order.createdAt).toLocaleString()}
        </p>
      </header>

      {/* Estado / Mensaje */}
      <section className="rounded-xl border p-4">
        <p className="text-lg">
          Estado de la orden: <span className="font-semibold">{order.status}</span>
        </p>
        {payment && (
          <p className="text-sm opacity-70 mt-1">
            Pago (Stripe): {payment.status} {payment.intentId ? `• ${payment.intentId}` : ""}
          </p>
        )}

        {needsRefresh && (
          <p className="text-sm mt-3">
            Procesando el pago… esta página se actualizará automáticamente en cuanto se confirme.
          </p>
        )}
      </section>

      {/* Lista de artículos */}
      <section>
        <h2 className="mb-2 font-medium">Artículos</h2>
        <ul className="divide-y rounded-xl border">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between p-3">
              <div className="space-y-0.5">
                <p className="font-medium">{it.name}</p>
                <p className="text-sm opacity-70">Cantidad: {it.qty}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatMXN(it.price * it.qty)}</p>
                <p className="text-sm opacity-70">{formatMXN(it.price)} c/u</p>
              </div>
            </li>
          ))}
          {order.items.length === 0 && (
            <li className="p-3 opacity-70">No hay artículos en este pedido.</li>
          )}
        </ul>
      </section>

      {/* Total */}
      <section className="flex items-center justify-end">
        <div className="rounded-full border px-4 py-2 text-sm">
          Total: <span className="font-semibold">{formatMXN(order.total)}</span>
        </div>
      </section>

      {/* Refresher (solo si hace falta) */}
      {needsRefresh && <ClientStatusRefresher orderId={order.id} />}
    </main>
  );
}

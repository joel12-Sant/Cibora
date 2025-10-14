import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Role, OrderStatus } from "@prisma/client";
import { formatMXN } from "@/lib/money";
import OrderStatusActions from "@/components/orders/OrderStatusActions";

type Params = Promise<{ id: string }>;

export default async function OrderDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const session = await auth();
  const user = session?.user ?? null;
  const ALLOWED = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF, Role.ADMIN]);

  if (!user || !user.tenantId || !ALLOWED.has(user.role)) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>No autorizado.</p>
        <Link className="underline" href="/dashboard">Volver</Link>
      </main>
    );
  }

  const order = await prisma.order.findFirst({
    where: { id, tenantId: user.tenantId },
    select: {
      id: true,
      status: true,
      total: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
      items: { select: { id: true, name: true, price: true, qty: true } },
      payments: {
        select: { id: true, provider: true, status: true, intentId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!order) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Pedido no encontrado.</p>
        <Link className="underline" href="/dashboard">Volver</Link>
      </main>
    );
  }

  const canAdvance =
    order.status === OrderStatus.CREATED ||
    order.status === OrderStatus.PAID ||
    order.status === OrderStatus.PREPARING ||
    order.status === OrderStatus.OUT_FOR_DELIVERY;

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pedido #{order.id.slice(0, 8)}</h1>
          <p className="text-sm opacity-70">
            {order.user?.email ?? "guest"} • {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <Link className="underline text-sm" href="/dashboard">Volver al panel</Link>
      </header>

      <section className="rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-70">Estado</p>
            <p className="text-lg font-medium">{order.status}</p>
          </div>
          <div className="flex items-center gap-3">
            {canAdvance ? (
              <OrderStatusActions orderId={order.id} initialStatus={order.status} />
            ) : (
              <span className="text-sm opacity-60">Sin acciones</span>
            )}
            <Link className="text-sm underline" href={`/orders/${order.id}/confirmation`}>
              Ver página de cliente
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-2 font-medium">Ítems</h2>
        <ul className="divide-y">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="inline-block w-8 text-right">{it.qty}×</span>
                <span>{it.name}</span>
              </div>
              <span className="tabular-nums">{formatMXN(it.price)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-end border-t pt-3">
          <p className="text-lg font-semibold">Total: {formatMXN(order.total)}</p>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-2 font-medium">Pagos recientes</h2>
        {order.payments.length === 0 ? (
          <p className="opacity-70 text-sm">Sin pagos registrados.</p>
        ) : (
          <ul className="divide-y">
            {order.payments.map((p) => (
              <li key={p.id} className="py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>
                    {p.provider} • {p.status}
                    {p.intentId ? ` • ${p.intentId}` : ""}
                  </span>
                  <span className="opacity-70">{new Date(p.createdAt).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

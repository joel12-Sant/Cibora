import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Role, OrderStatus } from "@prisma/client";
import Link from "next/link";
import OrderStatusActions from "@/components/orders/OrderStatusActions";
import { formatMXN } from "@/lib/money";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic"; 

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;

  const session = await auth();
  const user = session?.user ?? null;
  const ALLOWED = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF, Role.ADMIN]);

  if (!user || !user.tenantId || !ALLOWED.has(user.role)) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>No autorizado.</p>
        <Link className="underline" href="/orders/history/merchant">Volver</Link>
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
      user: { select: { name: true, email: true } },
      items: { select: { id: true, name: true, price: true, qty: true } },
      payments: { select: { id: true, provider: true, status: true, intentId: true, createdAt: true } },
    },
  });

  if (!order) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Pedido no encontrado.</p>
        <Link className="underline" href="/orders/history/merchant">Volver</Link>
      </main>
    );
  }

  const timeline = computeTimeline(order.status, order.createdAt);

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-5 sm:p-6 md:p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pedido #{order.id.slice(0, 8)}</h1>
          <p className="text-sm opacity-70">
            Cliente: {order.user?.name ?? "—"} ({order.user?.email ?? "—"})
          </p>
        </div>
        <Link href="/orders/history/merchant" className="underline">Volver</Link>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm mt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm opacity-70">Estado actual</p>
            <p className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">{order.status}</p>
          </div>
          <OrderStatusActions orderId={order.id} initialStatus={order.status} />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm mt-6">
        <h2 className="mb-3 font-medium">Ítems</h2>
        <ul className="divide-y">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">{it.name}</p>
                <p className="text-sm opacity-70">
                  {it.qty} × {formatMXN(it.price)}
                </p>
              </div>
              <p className="font-medium">{formatMXN(it.price * it.qty)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-end gap-4">
          <span className="opacity-70">Total</span>
          <span className="text-lg font-semibold">{formatMXN(order.total)}</span>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm mt-6">
        <h2 className="mb-3 font-medium">Pagos</h2>
        {order.payments.length === 0 ? (
          <p className="opacity-70 text-sm">Sin pagos registrados.</p>
        ) : (
          <ul className="divide-y">
            {order.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <div className="space-y-0.5">
                  <p className="font-medium">{p.provider.toUpperCase()} • {p.status}</p>
                  <p className="opacity-70">Intent: {p.intentId ?? "—"}</p>
                </div>
                <span className="opacity-70">{new Date(p.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm mt-6">
        <h2 className="mb-3 font-medium">Línea de tiempo</h2>
        <ol className="relative ml-3 border-l pl-5">
          {timeline.map((t) => (
            <li key={t.key} className="mb-4">
              <span className={`absolute -left-1.5 h-3 w-3 rounded-full ${t.done ? "bg-green-600" : "bg-gray-300"}`} />
              <p className="font-medium">{t.label}</p>
              <p className="text-xs opacity-70">{t.when ?? "—"}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex justify-end">
        <Link href={`/orders/${order.id}/confirmation`} className="underline text-sm">
          Ver confirmación pública
        </Link>
      </div>
      </div>
      </section>
    </main>
  );
}

function computeTimeline(status: OrderStatus, createdAt: Date): { key: string; label: string; when?: string; done: boolean }[] {
  const steps: { s: OrderStatus; label: string }[] = [
    { s: OrderStatus.CREATED, label: "Creado" },
    { s: OrderStatus.PAID, label: "Pagado" },
    { s: OrderStatus.PREPARING, label: "Preparando" },
    { s: OrderStatus.OUT_FOR_DELIVERY, label: "En camino" },
    { s: OrderStatus.DELIVERED, label: "Entregado" },
  ];

  // Marca como “done” todas las etapas <= estado actual
  const index = steps.findIndex((x) => x.s === status);
  const toLocal = (d: Date) => new Date(d).toLocaleString();

  return steps.map((st, i) => ({
    key: st.s,
    label: st.label,
    when: i === 0 ? toLocal(createdAt) : undefined, // para ahora mostramos sólo la fecha de creación
    done: index >= i,
  }));
}

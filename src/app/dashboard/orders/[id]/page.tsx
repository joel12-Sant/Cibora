// src/app/dashboard/orders/[id]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Role } from "@prisma/client";
import { formatMXN } from "@/lib/money";
import OrderStatusActions from "@/components/orders/OrderStatusActions";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function DashboardOrderDetailPage({ params }: Props) {
  const session = await auth();
  const user = session?.user ?? null;
  const ALLOWED = new Set<Role>(["MERCHANT_OWNER", "MERCHANT_STAFF", "ADMIN"] as const);
  if (!user || !user.tenantId || !ALLOWED.has(user.role)) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>No autorizado.</p>
        <Link className="underline" href="/dashboard">Volver</Link>
      </main>
    );
  }

  const { id } = await params;

  // Trae pedido + items y valida tenant
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      total: true,
      createdAt: true,
      tenantId: true,
      user: { select: { id: true, name: true, email: true } },
      items: { select: { id: true, name: true, price: true, qty: true } },
      payments: { select: { id: true, provider: true, status: true, intentId: true, createdAt: true } },
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
  if (user.role !== "ADMIN" && order.tenantId !== user.tenantId) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Tenant inválido.</p>
        <Link className="underline" href="/dashboard">Volver</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <nav className="text-sm">
        <Link className="underline" href="/dashboard">← Volver al panel</Link>
      </nav>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pedido #{order.id.slice(0, 8)}</h1>
          <p className="opacity-70 text-sm">
            Creado: {new Date(order.createdAt).toLocaleString()}
          </p>
          <p className="opacity-70 text-sm">
            Cliente: {order.user?.name ?? "—"} ({order.user?.email ?? "—"})
          </p>
        </div>
        <div className="flex items-center gap-3">
          <OrderStatusActions orderId={order.id} initialStatus={order.status} />
          <span className="inline-block rounded-full border px-3 py-1 text-sm">
            Total: {formatMXN(order.total)}
          </span>
        </div>
      </header>

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
          {order.items.length === 0 && <li className="p-3 opacity-70">Sin artículos.</li>}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-medium">Pagos</h2>
        <ul className="divide-y rounded-xl border">
          {order.payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between p-3">
              <div>
                <p className="font-medium">{p.provider.toUpperCase()} • {p.status}</p>
                <p className="text-sm opacity-70">Intent: {p.intentId ?? "—"}</p>
              </div>
              <div className="text-sm opacity-70">
                {new Date(p.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
          {order.payments.length === 0 && <li className="p-3 opacity-70">Aún no hay pagos.</li>}
        </ul>
      </section>
    </main>
  );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Role, OrderStatus } from "@prisma/client";
import ItemsTable from "@/app/dashboard/ItemsTable";
// ⬇️ Importa directo (sin dynamic)
import OrderStatusActions from "@/components/orders/OrderStatusActions";
// Formateador de moneda MXN (opcional, solo UI)
const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

function StatusBadge({ status }: { status: OrderStatus }) {
  const cls =
    status === "DELIVERED"
      ? "bg-green-100 text-green-800"
      : status === "OUT_FOR_DELIVERY"
      ? "bg-blue-100 text-blue-800"
      : status === "PREPARING"
      ? "bg-yellow-100 text-yellow-800"
      : status === "PAID"
      ? "bg-purple-100 text-purple-800"
      : status === "CREATED"
      ? "bg-gray-100 text-gray-800"
      : "bg-red-100 text-red-800"; // CANCELED
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as { id: string; role: Role; tenantId: string | null } | null;

  const ALLOWED = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF, Role.ADMIN]);

  if (!user || !user.tenantId || !ALLOWED.has(user.role)) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>No autorizado.</p>
        <Link className="underline" href="/">Volver</Link>
      </main>
    );
  }

  const [orders, items] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.menuItem.findMany({
      where: { menu: { tenantId: user.tenantId } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, price: true, active: true },
    }),
  ]);

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Panel del restaurante</h1>

      <section className="space-y-3">
        <h2 className="font-medium">Pedidos recientes</h2>
        <ul className="divide-y rounded-xl border">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between p-3">
              <div className="space-y-1">
                <p className="font-medium">
                  #{o.id.slice(0, 8)} • {o._count.items} ítems
                </p>
                <p className="text-sm opacity-70 flex items-center gap-2">
                  <StatusBadge status={o.status} />
                  <span>{mxn.format(o.total / 100)}</span>
                  <span className="text-xs">• {o.createdAt.toLocaleString()}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* ⬇️ Acciones de estado (client) */}
                <OrderStatusActions
                  orderId={o.id}
                  initialStatus={o.status}
                />
                <Link className="text-sm underline" href={`/orders/${o.id}/confirmation`}>
                  Ver
                </Link>
              </div>
            </li>
          ))}
          {orders.length === 0 && <li className="p-3 opacity-70">Sin pedidos aún.</li>}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Menú</h2>
        <ItemsTable items={items} />
      </section>
    </main>
  );
}

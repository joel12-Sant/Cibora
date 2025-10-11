// src/app/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Role, OrderStatus } from "@prisma/client";
import { formatMXN } from "@/lib/money";
import ItemsTable from "@/app/dashboard/ItemsTable";
import OrderStatusActions from "@/components/orders/OrderStatusActions";

type SearchParamsPromise = Promise<Record<string, string | string[] | undefined>>;
type Props = { searchParams?: SearchParamsPromise };

function isOrderStatus(x: unknown): x is OrderStatus {
  return typeof x === "string" && (Object.values(OrderStatus) as string[]).includes(x);
}

export default async function DashboardPage({ searchParams }: Props) {
  const session = await auth();
  const user = session?.user ?? null;

  const ALLOWED = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF, Role.ADMIN]);

  if (!user || !user.tenantId || !ALLOWED.has(user.role)) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>No autorizado.</p>
        <Link className="underline" href="/">Volver</Link>
      </main>
    );
    }

  const spRaw =
    (await (searchParams ??
      Promise.resolve({} as Record<string, string | string[] | undefined>))) ?? {};
  const statusParam = spRaw.status;
  const statusStr = Array.isArray(statusParam) ? statusParam[0] : statusParam;
  const statusFilter = isOrderStatus(statusStr) ? statusStr : undefined;

  const whereOrders = {
    tenantId: user.tenantId,
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  // Contadores por estado
  const counts = await prisma.order.groupBy({
    by: ["status"],
    where: { tenantId: user.tenantId },
    _count: { _all: true },
  });

  const countByStatus = new Map<OrderStatus, number>(
    Object.values(OrderStatus).map((s) => [s, 0]),
  );
  for (const row of counts) countByStatus.set(row.status, row._count._all);
  const totalAll = Array.from(countByStatus.values()).reduce((a, b) => a + b, 0);

  const [orders, items] = await Promise.all([
    prisma.order.findMany({
      where: whereOrders,
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

  const makeHref = (s?: OrderStatus) => (s ? `/dashboard?status=${s}` : "/dashboard");

  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const toISODate = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD

  const baseExport = "/api/orders/export";
  const exportAllHref = statusFilter ? `${baseExport}?status=${statusFilter}` : baseExport;
  const export30Href = statusFilter
    ? `${baseExport}?status=${statusFilter}&from=${toISODate(d30)}&to=${toISODate(now)}`
    : `${baseExport}?from=${toISODate(d30)}&to=${toISODate(now)}`;

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Panel del restaurante</h1>

      {/* Chips de conteo */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Chip href={makeHref()} active={!statusFilter} label={`Todos`} count={totalAll} />
        {Object.values(OrderStatus).map((s) => (
          <Chip
            key={s}
            href={makeHref(s)}
            active={statusFilter === s}
            label={s}
            count={countByStatus.get(s) ?? 0}
          />
        ))}
      </div>

      {/* Acciones de exportación */}
      <div className="flex flex-wrap gap-2 text-sm">
        <a
          href={exportAllHref}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1 underline"
        >
          Exportar CSV (todos{statusFilter ? ` - ${statusFilter}` : ""})
        </a>
        <a
          href={export30Href}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1 underline"
        >
          Exportar CSV (últimos 30 días{statusFilter ? ` - ${statusFilter}` : ""})
        </a>
      </div>

      <section>
        <h2 className="mb-2 font-medium">Pedidos recientes</h2>
        <ul className="divide-y rounded-xl border">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between p-3">
              <div>
                <p className="font-medium">#{o.id.slice(0, 8)} • {o._count.items} ítems</p>
                <p className="text-sm opacity-70">
                  {o.status} • {formatMXN(o.total)} • {new Date(o.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Acciones para cambiar estado */}
                <OrderStatusActions orderId={o.id} initialStatus={o.status} />
                <Link className="text-sm underline" href={`/dashboard/orders/${o.id}`}>
                  Gestionar
                </Link>
                <Link className="text-sm underline" href={`/orders/${o.id}/confirmation`}>
                  Ver
                </Link>
              </div>
            </li>
          ))}
          {orders.length === 0 && <li className="p-3 opacity-70">Sin pedidos.</li>}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-medium">Menú</h2>
        <ItemsTable items={items} />
      </section>
    </main>
  );
}

function Chip(props: { href: string; active: boolean; label: string; count: number }) {
  const base = "inline-flex items-center gap-2 rounded-full border px-3 py-1";
  const act = props.active ? "bg-black text-white border-black" : "bg-white text-black";
  return (
    <Link href={props.href} className={`${base} ${act}`}>
      <span>{props.label}</span>
      <span className="text-xs opacity-80">{props.count}</span>
    </Link>
  );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Role, OrderStatus, Prisma } from "@prisma/client";
import { formatMXN } from "@/lib/money";
import ItemsTable from "@/app/dashboard/ItemsTable";
import OrderStatusActions from "@/components/orders/OrderStatusActions";
import OrdersFilter from "./OrdersFilter";

type SearchParamsPromise = Promise<Record<string, string | string[] | undefined>>;
type Props = { searchParams?: SearchParamsPromise };

function isOrderStatus(x: unknown): x is OrderStatus {
  return typeof x === "string" && (Object.values(OrderStatus) as string[]).includes(x);
}

function parseDateISO(s?: string): Date | undefined {
  if (!s) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d.getTime()) ? undefined : d;
}
function parseDateISOEnd(s?: string): Date | undefined {
  if (!s) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const d = new Date(`${s}T23:59:59.999`);
  return isNaN(d.getTime()) ? undefined : d;
}

/** Convierte entrada en MXN a centavos.
 * "240" -> { min: 24000 }  (mínimo 240 MXN)
 * "=240" -> { exact: 24000 } (exactamente 240 MXN)
 * "6.40" -> { min: 640 } (o exact si antecede '=')
 * "6,40" igual que "6.40"
 */
function parseMoneyFilter(input?: string): { min?: number; exact?: number } {
  if (!input) return {};
  let s = input.trim();
  let exact = false;
  if (s.startsWith("=")) {
    exact = true;
    s = s.slice(1).trim();
  }
  s = s.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return {};
  const pesos = Number(s);
  const cents = Math.round(pesos * 100);
  return exact ? { exact: cents } : { min: cents };
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

  // status
  const statusParam = spRaw.status;
  const statusStr = Array.isArray(statusParam) ? statusParam[0] : statusParam;
  const statusFilter = isOrderStatus(statusStr) ? statusStr : undefined;

  // filtros
  const qParam = Array.isArray(spRaw.q) ? spRaw.q[0] : spRaw.q;
  const fromParam = Array.isArray(spRaw.from) ? spRaw.from[0] : spRaw.from;
  const toParam = Array.isArray(spRaw.to) ? spRaw.to[0] : spRaw.to;
  const minTotalMxParam = Array.isArray(spRaw.minTotalMx) ? spRaw.minTotalMx[0] : spRaw.minTotalMx;

  const fromDate = parseDateISO(fromParam);
  const toDate = parseDateISOEnd(toParam);
  const { min: minTotalCents, exact: exactTotalCents } = parseMoneyFilter(minTotalMxParam);

  // WHERE compuesto y tipado
  const whereOrders: Prisma.OrderWhereInput = {
    tenantId: user.tenantId ?? undefined,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
    ...(exactTotalCents !== undefined
      ? { total: exactTotalCents }
      : minTotalCents !== undefined
      ? { total: { gte: minTotalCents } }
      : {}),
    ...(qParam
      ? {
          OR: [
            { id: { startsWith: qParam } },
            { user: { email: { contains: qParam, mode: "insensitive" } } },
            { items: { some: { name: { contains: qParam, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  // Contadores por estado (por tenant)
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
      take: 50,
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        user: { select: { email: true } },
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

  // Export (igual)
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const toISODate = (d: Date) => d.toISOString().slice(0, 10);

  const baseExport = "/api/orders/export";
  const exportAllHref = statusFilter ? `${baseExport}?status=${statusFilter}` : baseExport;
  const export30Href = statusFilter
    ? `${baseExport}?status=${statusFilter}&from=${toISODate(d30)}&to=${toISODate(now)}`
    : `${baseExport}?from=${toISODate(d30)}&to=${toISODate(now)}`;

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Panel del restaurante</h1>

      {/* Chips por estado */}
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

      {/* Filtros */}
      <OrdersFilter />

      {/* Export */}
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
        <h2 className="mb-2 font-medium">Pedidos</h2>
        <ul className="divide-y rounded-xl border">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between p-3">
              <div>
                <p className="font-medium">#{o.id.slice(0, 8)} • {o._count.items} ítems</p>
                <p className="text-sm opacity-70">
                  {o.status} • {formatMXN(o.total)} • {new Date(o.createdAt).toLocaleString()} • {o.user?.email ?? "—"}
                </p>
              </div>
              <div className="flex items-center gap-3">
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

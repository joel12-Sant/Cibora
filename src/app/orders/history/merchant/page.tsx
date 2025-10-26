import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Role, OrderStatus, Prisma } from "@prisma/client";
import { formatMXN } from "@/lib/money";
import OrderStatusActions from "@/components/orders/OrderStatusActions";
import OrdersFilter from "@/app/orders/history/merchant/OrdersFilter";

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

/** Badges de estado (solo estilos) */
// Sustituye el STATUS_STYLES que tengas por este:
const STATUS_STYLES: Record<OrderStatus, string> = {
  CREATED: "bg-amber-100 text-amber-900 ring-amber-200",
  PAID: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  PREPARING: "bg-orange-100 text-orange-900 ring-orange-200",
  OUT_FOR_DELIVERY: "bg-blue-100 text-blue-900 ring-blue-200",
  DELIVERED: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  CANCELED: "bg-rose-100 text-rose-900 ring-rose-200",
};

// Etiquetas legibles en español:
const STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: "Creada",
  PAID: "Pagada",
  PREPARING: "Preparando",
  OUT_FOR_DELIVERY: "En camino",
  DELIVERED: "Entregada",
  CANCELED: "Cancelada",
};

function statusLabel(s: OrderStatus) {
  return STATUS_LABELS[s] ?? String(s);
}

export default async function DashboardPage({ searchParams }: Props) {
  const session = await auth();
  const user = session?.user ?? null;
  const ALLOWED = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF, Role.ADMIN]);

  if (!user || !user.tenantId || !ALLOWED.has(user.role)) {
    return (
      <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
        <section className="mx-auto w-full max-w-md px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-6 sm:p-8">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">No autorizado</h1>
            <p className="mt-2 text-sm text-zinc-600">Necesitas permisos para ver este panel.</p>
            <div className="mt-4">
              <Link
                className="text-zinc-700 underline underline-offset-2 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-md px-1 py-1"
                href="/"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const spRaw =
    (await (searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>))) ??
    {};

  const statusStr = Array.isArray(spRaw.status) ? spRaw.status[0] : spRaw.status;
  const statusFilter = isOrderStatus(statusStr) ? statusStr : undefined;

  const qParam = Array.isArray(spRaw.q) ? spRaw.q[0] : spRaw.q;
  const fromParam = Array.isArray(spRaw.from) ? spRaw.from[0] : spRaw.from;
  const toParam = Array.isArray(spRaw.to) ? spRaw.to[0] : spRaw.to;

  const fromDate = parseDateISO(fromParam);
  const toDate = parseDateISOEnd(toParam);

  const whereOrders: Prisma.OrderWhereInput = {
    tenantId: user.tenantId ?? undefined,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(fromDate || toDate
      ? { createdAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
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

  const counts = await prisma.order.groupBy({
    by: ["status"],
    where: { tenantId: user.tenantId },
    _count: { _all: true },
  });
  const countByStatus = new Map<OrderStatus, number>(Object.values(OrderStatus).map((s) => [s, 0]));
  for (const row of counts) countByStatus.set(row.status, row._count._all);
  const totalAll = Array.from(countByStatus.values()).reduce((a, b) => a + b, 0);

  const [orders] = await Promise.all([
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
  ]);

  const makeHref = (s?: OrderStatus) =>
    s ? `/orders/history/merchant?status=${s}` : "/orders/history/merchant";

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-5 sm:p-6 md:p-8">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Panel del restaurante</h1>
            {/* Resumen rápido (opcional, puedes quitarlo si no lo quieres) */}
            <div className="text-sm text-zinc-600">
              {statusFilter ? `Filtrado por: ${statusFilter}` : "Todos los estados"}
            </div>
          </header>

          {/* Chips de estado: scroll horizontal en mobile */}
          <div className="mt-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Chip href={makeHref()} active={!statusFilter} label="Todos" count={totalAll} />
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
          </div>

          {/* Filtros avanzados (componente propio) */}
          <div className="mt-5">
            <OrdersFilter />
          </div>

          {/* Lista de pedidos */}
          <section className="mt-6">
            <h2 className="mb-2 font-medium text-zinc-800">Pedidos</h2>

            <ul className="grid grid-cols-1 gap-3">
              {orders.map((o) => (
                <li key={o.id}>
                  <article
                    className="
                      group grid grid-cols-1 gap-3 rounded-2xl border border-zinc-200 bg-white p-4
                      shadow-sm transition hover:shadow-md focus-within:shadow-md
                      sm:grid-cols-12 sm:items-center sm:gap-4
                    "
                  >
                    {/* Columna principal: id, ítems y status badge */}
                    <div className="min-w-0 sm:col-span-6">
                      <p className="font-semibold text-zinc-900 truncate">
                        #{o.id.slice(0, 8)}
                        <span className="mx-2 text-zinc-400">•</span>
                        {o._count.items} ítems
                        <span className="mx-2 text-zinc-400">•</span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${STATUS_LABELS[o.status]}`}
                        >
                          {o.status}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-zinc-600">
                        {new Date(o.createdAt).toLocaleString()}{" "}
                        <span className="mx-2 text-zinc-400">•</span>
                        {formatMXN(o.total)}{" "}
                        <span className="mx-2 text-zinc-400">•</span>
                        {o.user?.email ?? "—"}
                      </p>
                    </div>

                    {/* Acciones (se apilan en móvil) */}
                    <div className="sm:col-span-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
                        <OrderStatusActions orderId={o.id} initialStatus={o.status} />

                        <div className="flex items-center gap-2">
                          <Link
                            className="
                              text-sm underline text-orange-700 hover:text-orange-700/80
                              rounded-md px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                            "
                            href={`/orders/history/merchant/${o.id}`}
                          >
                            Gestionar
                          </Link>

                          <Link
                            className="
                              text-sm underline text-zinc-700 hover:text-orange-700
                              rounded-md px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                            "
                            href={`/orders/${o.id}/confirmation`}
                          >
                            Ver
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                </li>
              ))}

              {orders.length === 0 && (
                <li className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-6 text-sm text-zinc-700">
                  Sin pedidos.
                </li>
              )}
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}

function Chip(props: { href: string; active: boolean; label: string; count: number }) {
  const base =
    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500";
  const active =
    "bg-amber-500 text-white ring-amber-400 hover:bg-orange-50 hover:text-orange-700";
  const inactive = "bg-white text-zinc-800 ring-amber-100 hover:bg-amber-50";
  return (
    <Link href={props.href} className={`${base} ${props.active ? active : inactive}`}>
      <span className="font-semibold">{props.label}</span>
      <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-zinc-700">
        {props.count}
      </span>
    </Link>
  );
}

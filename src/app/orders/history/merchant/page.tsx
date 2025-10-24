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
    const countByStatus = new Map<OrderStatus, number>(
        Object.values(OrderStatus).map((s) => [s, 0]),
    );
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

    const makeHref = (s?: OrderStatus) => (s ? `/orders/history/merchant?status=${s}` : "/orders/history/merchant");

    return (
        <main className="mx-auto max-w-5xl p-6 space-y-6">
            <h1 className="text-2xl font-semibold">Panel del restaurante</h1>
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

      <OrdersFilter />

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
                <Link className="text-sm underline" href={`/orders/history/merchant/${o.id}`}>Gestionar</Link>
                <Link className="text-sm underline" href={`/orders/${o.id}/confirmation`}>Ver</Link>
              </div>
            </li>
          ))}
          {orders.length === 0 && <li className="p-3 opacity-70">Sin pedidos.</li>}
        </ul>
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

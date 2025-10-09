// src/app/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Role, OrderStatus } from "@prisma/client";
import ItemsTable from "@/app/dashboard/ItemsTable";
import { formatMXN } from "@/lib/money";
import OrderStatusActions from "@/components/orders/OrderStatusActions";

type SearchParamsPromise = Promise<Record<string, string | string[] | undefined>>;
type Props = { searchParams?: SearchParamsPromise };

function isOrderStatus(x: unknown): x is OrderStatus {
  return typeof x === "string" && (Object.values(OrderStatus) as string[]).includes(x);
}

export default async function DashboardPage({ searchParams }: Props) {
  const session = await auth();
  const user = session?.user ?? null;
  const ALLOWED = new Set<Role>(["MERCHANT_OWNER", "MERCHANT_STAFF", "ADMIN"] as const);

  if (!user || !user.tenantId || !ALLOWED.has(user.role)) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>No autorizado.</p>
        <Link className="underline" href="/">Volver</Link>
      </main>
    );
  }

  // ✅ Next 15: searchParams viene como Promise y puede traer arrays
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

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Panel del restaurante</h1>

      <div className="flex gap-2 text-sm">
        <span>Filtrar:</span>
        <Link href={makeHref()} className={`underline ${!statusFilter ? "font-semibold" : ""}`}>
          Todos
        </Link>
        {Object.values(OrderStatus).map((s) => (
          <Link
            key={s}
            href={makeHref(s)}
            className={`underline ${statusFilter === s ? "font-semibold" : ""}`}
          >
            {s}
          </Link>
        ))}
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

              {/* ⬇️ Aquí va el paso 3: solo props primitivas */}
              <div className="flex items-center gap-3">
                <OrderStatusActions orderId={o.id} initialStatus={o.status} />
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

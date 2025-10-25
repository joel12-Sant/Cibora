import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatMXN } from "@/lib/money";

type SearchParamsPromise = Promise<Record<string, string | string[] | undefined>>;
type Props = { searchParams?: SearchParamsPromise };

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900 ring-amber-200",
  PREPARING: "bg-orange-100 text-orange-900 ring-orange-200",
  PAID: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  SHIPPED: "bg-blue-100 text-blue-900 ring-blue-200",
  DELIVERED: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-900 ring-rose-200",
  REFUNDED: "bg-zinc-100 text-zinc-800 ring-zinc-200",
};
function statusClasses(s: string) {
  return STATUS_STYLES[s] ?? "bg-zinc-100 text-zinc-800 ring-zinc-200";
}

export default async function OrdersHistoryPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/orders/history");
  }

  const spRaw =
    (await (searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>))) ?? {};
  const pageParam = spRaw.page;
  const pageStr = Array.isArray(pageParam) ? pageParam[0] : pageParam;
  const page = Math.max(1, Number(pageStr ?? "1"));

  const take = 10;
  const skip = (page - 1) * take;

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where: { userId: session.user.id } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / take));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-4 sm:p-6 md:p-8">
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Mis pedidos</h1>

          {/* Lista de pedidos como “cards” lisas */}
          <ul className="mt-5 grid grid-cols-1 gap-3">
            {orders.map((o) => (
              <li key={o.id}>
                <article
                  className="
                    group flex items-center justify-between gap-4 rounded-2xl border border-zinc-200
                    bg-white p-4 shadow-sm transition hover:shadow-md focus-within:shadow-md
                  "
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 truncate">
                      #{o.id.slice(0, 8)}
                      <span className="mx-2 text-zinc-400">•</span>
                      {o._count.items} ítems
                      <span className="mx-2 text-zinc-400">•</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${statusClasses(String(o.status))}`}>
                        {String(o.status)}
                      </span>
                    </p>

                    <p className="mt-1 text-sm text-zinc-600">
                      {new Date(o.createdAt).toLocaleString()}{" "}
                      <span className="mx-2 text-zinc-400">•</span>
                      {formatMXN(o.total)}
                    </p>
                  </div>

                  <Link
                    href={`/orders/${o.id}/confirmation`}
                    className="
                      shrink-0 inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold
                      bg-amber-500 text-white no-underline
                      hover:text-orange-700 hover:bg-orange-50 transition
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                    "
                  >
                    Ver
                  </Link>
                </article>
              </li>
            ))}

            {orders.length === 0 && (
              <li className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-6 text-sm text-zinc-700">
                Aún no tienes pedidos.{" "}
                <Link
                  href="/"
                  className="font-semibold text-orange-700 underline underline-offset-2 hover:opacity-90"
                >
                  Explora restaurantes →
                </Link>
              </li>
            )}
          </ul>

          {/* Paginación */}
          <nav className="mt-6 flex items-center justify-between text-sm">
            {hasPrev ? (
              <Link
                href={`/orders/history/customer?page=${page - 1}`}
                className="inline-flex items-center rounded-full px-4 py-2 font-medium bg-zinc-100 text-zinc-800 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                ← Anterior
              </Link>
            ) : (
              <span className="inline-flex items-center rounded-full px-4 py-2 font-medium bg-zinc-100 text-zinc-400 cursor-not-allowed">
                ← Anterior
              </span>
            )}

            <span className="text-zinc-600">
              Página <span className="font-semibold text-zinc-800">{page}</span> de{" "}
              <span className="font-semibold text-zinc-800">{totalPages}</span>
            </span>

            {hasNext ? (
              <Link
                href={`/orders/history/customer/?page=${page + 1}`}
                className="inline-flex items-center rounded-full px-4 py-2 font-medium bg-zinc-100 text-zinc-800 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                Siguiente →
              </Link>
            ) : (
              <span className="inline-flex items-center rounded-full px-4 py-2 font-medium bg-zinc-100 text-zinc-400 cursor-not-allowed">
                Siguiente →
              </span>
            )}
          </nav>
        </div>
      </section>
    </main>
  );
}

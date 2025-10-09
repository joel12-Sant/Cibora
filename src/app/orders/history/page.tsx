// src/app/orders/history/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatMXN } from "@/lib/money";

type SearchParamsPromise = Promise<Record<string, string | string[] | undefined>>;
type Props = { searchParams?: SearchParamsPromise };

export const dynamic = "force-dynamic";

export default async function OrdersHistoryPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/orders/history");
  }

  // ✅ Next 15: searchParams es Promise y puede traer arrays.
  const spRaw =
    (await (searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>))) ??
    {};
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
      // ✅ En select sólo booleans; el tipo de status lo infiere TS.
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        _count: { select: { items: true } }, // ✅ incluye _count si luego lo usas
      },
    }),
    prisma.order.count({ where: { userId: session.user.id } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / take));

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-xl font-semibold">Mis pedidos</h1>

      <ul className="divide-y rounded-xl border">
        {orders.map((o) => (
          <li key={o.id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">#{o.id.slice(0, 8)} • {o._count.items} ítems</p>
              <p className="text-sm opacity-70">
                {new Date(o.createdAt).toLocaleString()} • {formatMXN(o.total)} • {o.status}
              </p>
            </div>
            <a href={`/orders/${o.id}/confirmation`} className="text-sm underline">
              Ver
            </a>
          </li>
        ))}
        {orders.length === 0 && <li className="p-3 opacity-70">Aún no tienes pedidos.</li>}
      </ul>

      <nav className="flex items-center justify-between text-sm">
        <a
          className="underline disabled:opacity-50"
          href={page > 1 ? `/orders/history?page=${page - 1}` : "#"}
          aria-disabled={page <= 1}
        >
          ← Anterior
        </a>
        <span>Página {page} de {totalPages}</span>
        <a
          className="underline disabled:opacity-50"
          href={page < totalPages ? `/orders/history?page=${page + 1}` : "#"}
          aria-disabled={page >= totalPages}
        >
          Siguiente →
        </a>
      </nav>
    </main>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/db";
import SetTenantLocal from "@/components/tenant/SetTenantLocal";

export const dynamic = "force-dynamic";

export default async function MenusListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // tenantId
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: {
      id: true,
      menus: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          _count: { select: { items: true } },
        },
      },
    },
  });

  const menus = tenant?.menus ?? [];

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
      {/* Fija el tenantId local al entrar */}
      <SetTenantLocal tenantId={id} />

      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Tarjeta gigante */}
        <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-5 sm:p-6 md:p-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Menús</h1>
            <Link
              href="/cart"
              className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold
                         bg-amber-500 text-white no-underline
                         hover:text-orange-700 hover:bg-orange-50 transition
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              Ver carrito
            </Link>
          </header>

          {menus.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-6 text-sm text-zinc-700">
              Este restaurante aún no tiene menús.
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {menus.map((m) => (
                <li key={m.id}>
                  <article className="h-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md focus-within:shadow-md">
                    <h2 className="font-semibold text-zinc-900 line-clamp-1">
                      {m.name || "Menú"}
                    </h2>

                    <p className="mt-2 text-sm text-zinc-700">
                      {m._count.items} ítem{m._count.items === 1 ? "" : "s"}
                    </p>

                    <div className="mt-4">
                      <Link
                        href={`/restaurants/${id}/menus/${m.id}`}
                        className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold
                                   bg-amber-500 text-white no-underline
                                   hover:text-orange-700 hover:bg-orange-50 transition
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                      >
                        Ver menú
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

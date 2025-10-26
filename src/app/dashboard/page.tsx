import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Role } from "@prisma/client";
import { formatMXN } from "@/lib/money";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user ?? null;
  const ALLOWED = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF, Role.ADMIN]);

  if (!user || !user.tenantId || !ALLOWED.has(user.role)) {
    return (
      <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
        <section className="mx-auto w-full max-w-md px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-6 sm:p-8">
            <p className="text-zinc-800">No autorizado.</p>
            <Link className="mt-3 inline-block text-zinc-700 underline underline-offset-2 hover:text-orange-700" href="/">
              Volver
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // ===== Helpers de rutas (ajusta si tus paths son distintos) =====
  const createHref = "/dashboard/menu/new";
  const manageHref = (menuId: string) => `/dashboard/menu/${menuId}`; // ó `/dashboard/menu?menuId=${menuId}`

  // ===== Carga de menús del tenant (con preview de ítems) =====
  const menus = await prisma.menu.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { items: true } },
      items: {
        take: 3,
        orderBy: { name: "asc" },
        select: { id: true, name: true, price: true, active: true },
      },
    },
  });

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-5 sm:p-6 md:p-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Panel del restaurante</h1>

            <div className="flex items-center gap-2">
              <Link
                href={createHref}
                className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold
                           bg-amber-500 text-white hover:text-orange-700 hover:bg-orange-50 transition
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                Crear nuevo menú
              </Link>
            </div>
          </header>

          {/* Listado de menús */}
          <section className="mt-6">
            <h2 className="sr-only">Menús del restaurante</h2>

            {menus.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {menus.map((m) => (
                  <li key={m.id}>
                    <article
                      className="group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-4
                                 shadow-sm transition hover:shadow-md focus-within:shadow-md"
                    >
                      {/* Encabezado del menú */}
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="min-w-0 truncate font-semibold text-zinc-900">{m.name}</h3>
                        <span className="shrink-0 rounded-full bg-amber-50 ring-1 ring-amber-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                          {m._count.items} ítems
                        </span>
                      </div>

                      {/* Preview de ítems (hasta 3) */}
                      <ul className="mt-3 space-y-2">
                        {m.items.map((it) => (
                          <li key={it.id} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm text-zinc-800">
                                {it.name}
                                {!it.active && (
                                  <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 ring-1 ring-zinc-200">
                                    inactivo
                                  </span>
                                )}
                              </p>
                            </div>
                            <span className="shrink-0 tabular-nums text-sm text-zinc-700">
                              {formatMXN(it.price)}
                            </span>
                          </li>
                        ))}
                        {m.items.length === 0 && (
                          <li className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 p-3 text-xs text-zinc-600">
                            Aún no hay ítems en este menú.
                          </li>
                        )}
                      </ul>

                      {/* Acciones */}
                      <div className="mt-4 flex items-center justify-end">
                        <Link
                          href={manageHref(m.id)}
                          className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold
                                     bg-amber-500 text-white no-underline
                                     hover:text-orange-700 hover:bg-orange-50 transition
                                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                        >
                          Gestionar menú
                        </Link>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-6 text-sm text-zinc-700">
                Aún no tienes menús.{" "}
                <Link
                  href={createHref}
                  className="font-semibold text-orange-700 underline underline-offset-2 hover:opacity-90"
                >
                  Crea tu primer menú →
                </Link>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

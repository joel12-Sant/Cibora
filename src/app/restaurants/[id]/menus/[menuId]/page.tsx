import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMXN } from "@/lib/money";
import AddToCartButton from "@/components/cart/AddToCartButton";
import SetTenantLocal from "@/components/tenant/SetTenantLocal";

export const dynamic = "force-dynamic";

export default async function MenuItemsPage({
  params,
}: {
  params: Promise<{ id: string; menuId: string }>;
}) {
  const { id, menuId } = await params; // tenantId, menuId

  const menu = await prisma.menu.findFirst({
    where: { id: menuId, tenantId: id },
    select: {
      id: true,
      name: true,
      items: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          price: true,
          active: true,
          imageUrl: true,
          description: true,
        },
      },
    },
  });

  if (!menu) {
    return (
      <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
        <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-5 sm:p-6 md:p-8">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Menú no encontrado</h1>
            <div className="mt-4">
              <Link
                href={`/restaurants/${id}/menus`}
                className="text-zinc-700 underline underline-offset-2 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-md px-2 py-1"
              >
                ← Volver a menús
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
      {/* Fija el tenant en local storage para el carrito */}
      <SetTenantLocal tenantId={id} />

      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Tarjeta gigante */}
        <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-5 sm:p-6 md:p-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
                {menu.name || "Menú"}
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/restaurants/${id}/menus`}
                className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium bg-zinc-100 text-zinc-800 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                ← Menús
              </Link>
              <Link
                href="/cart"
                className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold
                           bg-amber-500 text-white no-underline
                           hover:text-orange-700 hover:bg-orange-50 transition
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                Ver carrito
              </Link>
            </div>
          </header>

          {/* Ítems del menú */}
          {menu.items.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-6 text-sm text-zinc-700">
              Aún no hay ítems en este menú.
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {menu.items.map((it) => (
                <li key={it.id}>
                  <article className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md focus-within:shadow-md">
                    <div>
                      <p className="font-semibold text-zinc-900">
                        {it.name}
                        {it.active === false && (
                          <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 ring-1 ring-zinc-200">
                            inactivo
                          </span>
                        )}
                      </p>
                      {it.description ? (
                        <p className="mt-1 text-sm text-zinc-600 line-clamp-2">{it.description}</p>
                      ) : null}
                      <p className="mt-2 text-sm text-zinc-700">{formatMXN(it.price)} c/u</p>
                    </div>

                    <div className="mt-4">
                      <AddToCartButton
                        tenantId={id}
                        id={it.id}
                        name={it.name}
                        price={it.price}
                      />
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

import Link from "next/link";

type Restaurant = { id: string; name: string };

async function getRestaurants(): Promise<Restaurant[]> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const res = await fetch(`${base}/api/restaurants`, { cache: "no-store" });
  if (!res.ok) throw new Error("Error al cargar restaurantes");
  const json = await res.json();
  return json.data as Restaurant[];
}

export default async function RestaurantsPage() {
  const restaurants = await getRestaurants();

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-4 sm:p-6 md:p-8">
          <header className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Restaurantes</h1>
            <Link
              href="/cart"
              aria-label="Ver carrito"
              className="
                inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold
                bg-amber-500 text-white no-underline
                hover:text-orange-700 hover:bg-orange-50 transition
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
              "
            >
              Ver carrito
            </Link>
          </header>

          <p className="mt-2 text-sm text-zinc-600">
            Elige tu lugar favorito y ordena en minutos.
          </p>

          <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((r) => (
              <li key={r.id}>
                <article
                  className="
                    group h-full rounded-2xl border border-zinc-200 bg-white
                    p-4 shadow-sm transition hover:shadow-md focus-within:shadow-md
                  "
                >
                  <header className="mb-2">
                    <h2 className="text-base font-semibold leading-tight">
                      {r.name}
                    </h2>
                  </header>

                  <div className="mt-2">
                    <Link
                      href={`/restaurants/${r.id}`}
                      className="
                        inline-flex items-center gap-1 text-sm font-medium text-orange-700
                        hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded
                      "
                    >
                      Ver menú
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                        <path
                          d="M9 18l6-6-6-6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

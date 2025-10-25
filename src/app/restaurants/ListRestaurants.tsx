import Link from "next/link";
import Image from "next/image";

type Restaurant = { id: string; name: string; description: string; imageURL: string };

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
                    group h-full overflow-hidden rounded-2xl border border-zinc-200 bg-white
                    shadow-sm transition hover:shadow-md focus-within:shadow-md
                  "
                >
                  {/* Imagen cover */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    {r.imageURL ? (
                      <Image
                        src={r.imageURL}
                        alt={`Foto de ${r.name}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        priority={false}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-orange-100" />
                    )}
                    {/* Sutil overlay para legibilidad si luego queremos texto encima */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent" />
                  </div>

                  {/* Contenido */}
                  <div className="p-4">
                    <header>
                      <h2 className="text-base font-semibold leading-tight text-zinc-900">
                        {r.name}
                      </h2>
                      <p
                        className="
                          mt-1 text-sm text-zinc-600
                          [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden
                        "
                      >
                        {r.description}
                      </p>
                    </header>

                    <div className="mt-3">
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

import Link from "next/link";

type Restaurant = { id: string; name: string };

async function getRestaurants(): Promise<Restaurant[]> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const res = await fetch(`${base}/api/restaurants`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Error al cargar restaurantes");
  }
  const json = await res.json();
  return json.data as Restaurant[];
}

export default async function RestaurantsPage() {
  const restaurants = await getRestaurants();

  return (
    <main className="space-y-6 p-6 mx-auto max-w-3xl">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Restaurantes</h2>
        <Link href="/cart" className="underline">
          Ver carrito
        </Link>
      </header>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {restaurants.map((r) => (
          <li key={r.id} className="rounded-xl border p-4">
            <div className="font-medium mb-2">{r.name}</div>
            <Link
              className="text-sm opacity-80 hover:underline"
              href={`/restaurants/${r.id}`}
            >
              Ver menú →
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

type Restaurant = { id: string; name: string };

async function getRestaurants(): Promise<Restaurant[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/restaurants`, {
    // En Vercel, usa `next: { revalidate: N }` si quieres ISR.
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Error al cargar restaurantes");
  const json = await res.json();
  return json.data as Restaurant[];
}

export default async function RestaurantsPage() {
  const restaurants = await getRestaurants();

  return (
    <main className="space-y-6">
      <h2 className="text-xl font-semibold">Restaurantes</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {restaurants.map((r) => (
          <li key={r.id} className="rounded-xl border p-4">
            <div className="font-medium">{r.name}</div>
            <a className="text-sm opacity-80 hover:underline" href={`/restaurants/${r.id}`}>
              Ver menú →
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}

import Link from "next/link";
import RestaurantsExplorer from "@/app/restaurants/RestaurantsExplorer";
import StyleButton from "@/components/style-button"

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
          </header>
          
          <p className="mt-2 text-sm text-zinc-600">Elige tu lugar favorito y ordena en minutos.</p>

          <RestaurantsExplorer restaurants={restaurants} />
        </div>
      </section>
    </main>
  );
}

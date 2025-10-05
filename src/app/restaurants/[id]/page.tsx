// src/app/restaurants/[id]/page.tsx
import Link from "next/link";
import { AddToCartButton } from "@/features/cart/AddToCartBuntton";

// Tipo mínimo para los items del menú que devuelve tu API
type MenuItem = {
  id: string;
  name: string;
  price: number; // MXN
  active: boolean;
};

// Carga del menú del restaurante (server-side)
async function getMenu(restaurantId: string): Promise<MenuItem[]> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = `${base}/api/restaurants/${restaurantId}/menu`;

  const res = await fetch(url, {
    // En desarrollo conviene no cachear para ver cambios al instante
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Error al cargar menú (${res.status})`);
  }

  const json = await res.json();
  // Ajusta este mapeo si tu API usa otra forma (p. ej. json.items)
  return (json?.items ?? json) as MenuItem[];
}

// ⚠️ Importante para Next 15+: `params` es async
export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const menu = await getMenu(id);

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Menú</h1>
        {/* Ya no pasamos tenant por query: el backend lo deduce */}
        <Link href="/cart" className="underline">
          Ver carrito
        </Link>
      </header>

      {menu.length === 0 ? (
        <p className="opacity-70">Este restaurante aún no tiene items.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {menu.map((item) => (
            <li key={item.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm opacity-70">${item.price} MXN</p>
                {!item.active && (
                  <span className="text-xs text-red-500">No disponible</span>
                )}
              </div>

              <div>
                <AddToCartButton
                  id={item.id}
                  name={item.name}
                  price={item.price}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

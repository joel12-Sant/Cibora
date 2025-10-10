import Link from "next/link";
//import { AddToCartButton } from "@/features/cart/AddToCartBuntton";
import AddToCartButton from "@/components/cart/AddToCartButton";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  active: boolean;
};

async function getMenu(restaurantId: string): Promise<MenuItem[]> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = `${base}/api/restaurants/${restaurantId}/menu`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Error al cargar menú (${res.status})`);

  const json = await res.json();
  const items =
    (Array.isArray(json?.items) && json.items) ||
    (Array.isArray(json?.data) && json.data) ||
    [];
  return items as MenuItem[];
}

export default async function Page({
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
        <Link href="/cart" className="underline">
          Ver carrito
        </Link>
      </header>

      {menu.length === 0 ? (
        <p className="opacity-70">Este restaurante aún no tiene items.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {menu.map((it) => (
  <li key={it.id} className="flex items-center justify-between p-3">
    <div>
      <p className="font-medium">{it.name}</p>
      <p className="text-sm opacity-70">${it.price}.00 MXN</p>
    </div>
    <AddToCartButton id={it.id} name={it.name} price={it.price} />
  </li>
))}
        </ul>
      )}
    </main>
  );
}

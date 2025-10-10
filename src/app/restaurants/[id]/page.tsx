import Link from "next/link";
import AddToCartButton from "@/components/cart/AddToCartButton";
import SetTenantLocal from "@/components/tenant/SetTenantLocal";
import { formatMXN } from "@/lib/money";

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
  const { id } = await params; // 👈 este 'id' es el tenantId
  const menu = await getMenu(id);

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      {/* Fija el tenantId local al entrar a este restaurante */}
      <SetTenantLocal tenantId={id} />

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
                <p className="text-sm opacity-70">{formatMXN(it.price)} c/u</p>
              </div>
              <AddToCartButton
                tenantId={id}     // 👈 tenant actual
                id={it.id}
                name={it.name}
                price={it.price}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

import Link from "next/link";
import QuickBuy from "@/features/orders/QuickBuy";

type Props = { params: Promise<{ id: string }> }; // ⬅️ Promise

type MenuItem = { id: string; name: string; price: number; active: boolean };
type MenuDto = { id: string; name: string; items: MenuItem[] };

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function getMenu(tenantId: string): Promise<MenuDto | null> {
  const res = await fetch(`${getBaseUrl()}/api/restaurants/${tenantId}/menu`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data as MenuDto | null;
}

export default async function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const menu = await getMenu(id);

  if (!menu) {
    return (
      <main className="space-y-6">
        <h2 className="text-xl font-semibold">Menú</h2>
        <p className="opacity-80">No se encontró el menú para este restaurante.</p>
        <Link href="/restaurants" className="underline">← Volver</Link>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <h2 className="text-xl font-semibold">{menu.name}</h2>
      <ul className="space-y-3">
        {menu.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-xl border p-4">
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-sm opacity-80">$ {item.price}</div>
            </div>
            <QuickBuy tenantId={id} itemId={item.id} />
          </li>
        ))}
      </ul>
    </main>
  );
}

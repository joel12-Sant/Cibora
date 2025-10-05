"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/features/cart/cart-store";

export default function CartPage() {
  const { items, remove, setQty, total, clear } = useCart();
  const router = useRouter();

  async function createOrder() {
    if (items.length === 0) return;

    const body = {
      items: items.map((i) => ({ id: i.id, qty: i.qty })),
    };

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert("No se pudo crear la orden: " + (j?.error ?? res.statusText));
      return;
    }

    const j = await res.json();
    clear();
    router.push(`/orders/${j.order.id}/pay`);
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold mb-4">Carrito</h1>
        <p className="opacity-70">Tu carrito está vacío.</p>
        <div className="mt-4">
          <Link href="/restaurants" className="underline">Ver restaurantes</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Carrito</h1>

      <ul className="divide-y">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{i.name}</p>
              <p className="text-sm opacity-70">${i.price} MXN</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={i.qty}
                onChange={(e) => setQty(i.id, Number(e.target.value || 1))}
                className="w-16 rounded border bg-transparent px-2 py-1"
              />
              <button onClick={() => remove(i.id)} className="rounded border px-2 py-1">
                Quitar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t pt-4">
        <span className="font-medium">Total</span>
        <span className="font-semibold">${total()} MXN</span>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button onClick={() => clear()} className="rounded border px-3 py-1.5">
          Vaciar
        </button>
        <button
          onClick={createOrder}
          className="rounded-lg border px-4 py-2 hover:bg-white/5"
        >
          Crear orden
        </button>
      </div>
    </main>
  );
}

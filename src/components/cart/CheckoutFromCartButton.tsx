"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/features/cart/cart-store";

type ApiResponse =
  | { orderId: string }
  | { error: string };

export default function CheckoutFromCartButton() {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const disabled = loading || items.length === 0;

  async function handleCheckout() {
    if (disabled) return;
    setLoading(true);
    setMsg(null);
    try {
      // Mapeamos el carrito al formato que suele esperar tu API:
      // items: [{ itemId, qty }]
      const payload = {
        items: items.map(it => ({ itemId: it.id, qty: it.qty })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as ApiResponse;

      if (!res.ok || !("orderId" in data)) {
        setMsg(("error" in data && data.error) ? data.error : "No se pudo crear la orden.");
        setLoading(false);
        return;
      }

      // (Opcional) limpiar el carrito aquí o hasta que llegue a la confirmación
      // clear();

      router.push(`/orders/${data.orderId}/pay`);
    } catch (e) {
      setMsg("No se pudo iniciar el pago.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      <button
        type="button"
        onClick={handleCheckout}
        disabled={disabled}
        className="rounded-md border px-3 py-1 text-sm underline disabled:opacity-50"
        aria-disabled={disabled}
      >
        {loading ? "Creando orden…" : "Continuar al pago"}
      </button>
    </div>
  );
}

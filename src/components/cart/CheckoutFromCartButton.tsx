// src/components/cart/CheckoutFromCartButton.tsx
"use client";

import { useState } from "react";
import { useCart } from "@/features/cart/cart-store";

type Props = {
  className?: string;
};

export default function CheckoutFromCartButton({ className }: Props) {
  const items = useCart((s) => s.items);
  // const clear = useCart((s) => s.clear); // úsalo si quieres vaciar después
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleClick() {
    if (creating || items.length === 0) return;
    setCreating(true);
    setMsg(null);
    try {
      const payload = { items: items.map((it) => ({ id: it.id, qty: it.qty })) };
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        // ignore
      }

      if (!res.ok) {
        const message =
          typeof data === "string"
            ? data
            : (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
                ? (data as { error: string }).error
                : "No se pudo crear la orden.");
        setMsg(message);
        setCreating(false);
        return;
      }

      let orderId: string | null = null;
      if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        if (typeof obj.orderId === "string") orderId = obj.orderId as string;
        else if (typeof obj.id === "string") orderId = obj.id as string;
        else if (obj.order && typeof (obj.order as { id?: unknown }).id === "string") {
          orderId = (obj.order as { id: string }).id;
        }
      }

      if (!orderId) {
        setMsg("La respuesta no incluyó un orderId.");
        setCreating(false);
        return;
      }

      window.location.href = `/orders/${orderId}/pay`;
    } catch {
      setMsg("No se pudo iniciar el pago.");
      setCreating(false);
    }
  }

  return (
    <button
      type="button"
      className={className ?? "rounded-md border px-3 py-1 text-sm underline disabled:opacity-50"}
      disabled={creating || items.length === 0}
      onClick={handleClick}
      aria-label="Continuar al pago"
    >
      {creating ? "Creando orden…" : "Continuar al pago"}
      {msg && <span className="ml-2 text-red-600 text-xs">{msg}</span>}
    </button>
  );
}

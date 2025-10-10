"use client";

import { useState } from "react";
// Asegúrate que esta ruta sea EXACTAMENTE la misma que usa CartBadge
import { useCartStore } from "@/stores/cart";

type Props = {
  id: string;
  name: string;
  price: number; // en pesos enteros (ej: 120 = $120.00)
  qty?: number;
};

export default function AddToCartButton({ id, name, price, qty = 1 }: Props) {
  const add = useCartStore((s) => s.add);
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      className="rounded-md border px-3 py-1 text-sm"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        add({ id, name, price, qty });
        // pequeño delay visual opcional
        setTimeout(() => setLoading(false), 120);
      }}
    >
      {loading ? "Agregando…" : "Agregar"}
    </button>
  );
}

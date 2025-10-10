"use client";

import { useState } from "react";
import { useCart } from "@/features/cart/cart-store";

type Props = {
  id: string;
  name: string;
  price: number; // MXN (enteros)
  qty?: number;
};

export default function AddToCartButton({ id, name, price, qty = 1 }: Props) {
  const add = useCart((s) => s.add);
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      className="rounded-md border px-3 py-1 text-sm"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        add({ id, name, price }, qty);
        setTimeout(() => setLoading(false), 120);
      }}
    >
      {loading ? "Agregando…" : "Agregar"}
    </button>
  );
}

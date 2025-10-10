"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// ⬇️ Ajusta este import al de tu proyecto:
import { useCartStore } from "@/stores/cart";

/** Calcula el total de unidades en el carrito */
function useCartCount(): number {
  // ⬇️ Ajusta este selector a tu shape de estado
  // Ejemplo esperado: state.items: Array<{ qty: number }>
  const items = useCartStore((s) => s.items);
  return Array.isArray(items) ? items.reduce((acc, it) => acc + (it.qty ?? 0), 0) : 0;
}

export default function CartBadge() {
  const count = useCartCount();
  // Evita hidration mismatch si tu store inicializa en cliente
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready || count <= 0) return null;

  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm"
      aria-label={`Carrito con ${count} ${count === 1 ? "artículo" : "artículos"}`}
    >
      Carrito
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-xs">
        {count}
      </span>
    </Link>
  );
}

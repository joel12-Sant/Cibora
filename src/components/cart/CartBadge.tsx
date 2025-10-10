"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/features/cart/cart-store";

function useCartCount(): number {
  const items = useCart((s) => s.items);
  return Array.isArray(items) ? items.reduce((acc, it) => acc + (it.qty ?? 0), 0) : 0;
}

export default function CartBadge() {
  const count = useCartCount();
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

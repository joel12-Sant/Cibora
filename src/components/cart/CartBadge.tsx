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
      className=" inline-flex items-center rounded-full px-4 py-2 text-sm font-medium
                  bg-amber-500 text-white no-underline
                  hover:text-orange-700 hover:bg-orange-50 transition
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      aria-label={`Carrito con ${count} ${count === 1 ? "artículo" : "artículos"}`}
    >
      Carrito&nbsp;
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-xs">
        {count}
      </span>
    </Link>
  );
}

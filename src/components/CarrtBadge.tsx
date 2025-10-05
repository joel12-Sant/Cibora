"use client";
import Link from "next/link";
import { useCart } from "@/features/cart/cart-store";

export default function CartBadge() {
  const count = useCart((s) => s.items.reduce((acc, i) => acc + i.qty, 0));
  return (
    <Link href="/cart" className="rounded-lg border px-3 py-1.5 hover:bg-white/5">
      Carrito ({count})
    </Link>
  );
}

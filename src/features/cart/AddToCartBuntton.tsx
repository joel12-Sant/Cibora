"use client";
import { useCart } from "@/features/cart/cart-store";

export function AddToCartButton(props: { id: string; name: string; price: number }) {
  const add = useCart((s) => s.add);
  return (
    <button
      onClick={() => add({ id: props.id, name: props.name, price: props.price }, 1)}
      className="rounded-lg border px-3 py-1.5 hover:bg-white/5"
    >
      Agregar
    </button>
  );
}

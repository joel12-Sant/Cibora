// src/app/cart/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/features/cart/cart-store";
import { formatMXN } from "@/lib/money";

export default function CartPage() {
  const items = useCart((s) => s.items);
  const remove = useCart((s) => s.remove);
  const setQty = useCart((s) => s.setQty);
  const clear = useCart((s) => s.clear);

  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const total = useMemo(
    () => items.reduce((acc, it) => acc + it.price * it.qty, 0),
    [items]
  );

  if (!ready) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold mb-4">Carrito</h1>
        <p className="opacity-70">Cargando…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Carrito</h1>
        {items.length > 0 && (
          <button className="text-sm underline" onClick={() => clear()} type="button">
            Vaciar
          </button>
        )}
      </header>

      <ul className="divide-y rounded-xl border">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between p-3 gap-3">
            <div>
              <p className="font-medium">{it.name}</p>
              <p className="text-sm opacity-70">{formatMXN(it.price)} c/u</p>
            </div>
            <div className="flex items-center gap-2">
              <QtyControl value={it.qty} onChange={(q) => setQty(it.id, q)} />
              <div className="w-24 text-right font-medium">
                {formatMXN(it.price * it.qty)}
              </div>
              <button
                className="text-sm underline"
                onClick={() => remove(it.id)}
                type="button"
              >
                Quitar
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="p-3 opacity-70">Tu carrito está vacío.</li>}
      </ul>

      <div className="flex items-center justify-end gap-4">
        <div className="rounded-full border px-4 py-2 text-sm">
          Total: <span className="font-semibold">{formatMXN(total)}</span>
        </div>
        {/* Si ya tienes el flujo de orden/checkout, coloca aquí el link/botón */}
        {/* <a href="/checkout" className="rounded-md border px-3 py-1 text-sm underline">Continuar</a> */}
      </div>
    </main>
  );
}

function QtyControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (q: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <button
        className="rounded-md border px-2 py-1 text-sm"
        onClick={() => onChange(Math.max(1, value - 1))}
        type="button"
        aria-label="Disminuir"
      >
        −
      </button>
      <input
        className="w-12 rounded-md border p-1 text-center text-sm"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) && n > 0 ? Math.floor(n) : 1);
        }}
        inputMode="numeric"
        aria-label="Cantidad"
      />
      <button
        className="rounded-md border px-2 py-1 text-sm"
        onClick={() => onChange(value + 1)}
        type="button"
        aria-label="Aumentar"
      >
        +
      </button>
    </div>
  );
}

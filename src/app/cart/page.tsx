// src/app/cart/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/features/cart/cart-store";
import { formatMXN } from "@/lib/money";

/** Convierte posibles respuestas de error (incluido ZodError) a un string seguro */
function normalizeErrorMessage(data: unknown, fallback = "No se pudo crear la orden."): string {
  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    // Convención común: { error: "..." } o { error: { _errors:[...] } }
    const err = obj.error;
    if (typeof err === "string") return err;
    if (err && typeof err === "object") {
      const rootErrors = (err as { _errors?: unknown })._errors;
      if (Array.isArray(rootErrors) && rootErrors.length > 0) {
        return rootErrors.filter((x) => typeof x === "string").join(", ");
      }
    }

    // ZodError formateado: { _errors:[], items:{ _errors:[], 0:{id:{_errors:["..."]}} } }
    const rootErrors = (obj as { _errors?: unknown })._errors;
    if (Array.isArray(rootErrors) && rootErrors.length > 0) {
      return rootErrors.filter((x) => typeof x === "string").join(", ");
    }
    const items = (obj as { items?: any }).items;
    if (items && typeof items === "object") {
      const ie = (items as { _errors?: unknown })._errors;
      if (Array.isArray(ie) && ie.length > 0) {
        return ie.filter((x) => typeof x === "string").join(", ");
      }
      // Busca errores anidados comunes: items.0.id._errors
      for (const k of Object.keys(items)) {
        const maybe = (items as any)[k];
        if (maybe && typeof maybe === "object" && maybe.id && Array.isArray(maybe.id._errors)) {
          const msgs = maybe.id._errors.filter((x: unknown) => typeof x === "string");
          if (msgs.length) return msgs.join(", ");
        }
      }
    }

    try {
      return JSON.stringify(data);
    } catch {
      // ignore
    }
  }

  return fallback;
}

export default function CartPage() {
  const items = useCart((s) => s.items);
  const remove = useCart((s) => s.remove);
  const setQty = useCart((s) => s.setQty);
  // const clear = useCart((s) => s.clear);

  // Evitar hydration mismatch cuando hay persistencia
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const total = useMemo(
    () => items.reduce((acc, it) => acc + it.price * it.qty, 0),
    [items]
  );

  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
        {/* {items.length > 0 && (
          <button className="text-sm underline" onClick={() => clear()} type="button">
            Vaciar
          </button>
        )} */}
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

      <div className="flex flex-col items-end gap-2">
        <div className="rounded-full border px-4 py-2 text-sm">
          Total: <span className="font-semibold">{formatMXN(total)}</span>
        </div>

        {msg && <p className="text-sm text-red-600">{msg}</p>}

        <button
          type="button"
          className="rounded-md border px-3 py-1 text-sm underline disabled:opacity-50"
          disabled={creating || items.length === 0}
          onClick={async () => {
            if (creating || items.length === 0) return;
            setCreating(true);
            setMsg(null);
            try {
              // 👇 Tu API espera { items: [{ id, qty }] }
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
                // respuesta sin body
              }

              if (!res.ok) {
                setMsg(normalizeErrorMessage(data));
                setCreating(false);
                return;
              }

              // Acepta {orderId} | {id} | {order:{id}}
              let orderId: string | null = null;
              if (data && typeof data === "object") {
                const obj = data as Record<string, unknown>;
                if (typeof obj.orderId === "string") orderId = obj.orderId;
                else if (typeof obj.id === "string") orderId = obj.id;
                else if (
                  obj.order &&
                  typeof (obj.order as { id?: unknown }).id === "string"
                ) {
                  orderId = (obj.order as { id: string }).id;
                }
              }

              if (!orderId) {
                console.warn("Respuesta inesperada de /api/orders:", data);
                setMsg("La respuesta no incluyó un orderId.");
                setCreating(false);
                return;
              }

              // Redirige al flujo de pago
              window.location.href = `/orders/${orderId}/pay`;
            } catch {
              setMsg("No se pudo iniciar el pago.");
              setCreating(false);
            }
          }}
        >
          {creating ? "Creando orden…" : "Continuar al pago"}
        </button>
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

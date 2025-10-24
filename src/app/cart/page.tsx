"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "@/features/cart/cart-store";
import { getLocalTenantId } from "@/lib/tenant-local";
import { formatMXN } from "@/lib/money";
import CartHydrator from "./CartHydrator";

// ----------- Helpers de tipado seguros -----------
type StringDict = Record<string, unknown>;

function isRecord(value: unknown): value is StringDict {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "Error desconocido";
  }
}

function getNestedErrors(obj: unknown, keys: string[]): string[] | null {
  let current: unknown = obj;
  for (const k of keys) {
    if (!isRecord(current)) return null;
    current = current[k];
  }
  if (isRecord(current) && "_errors" in current && isStringArray((current as StringDict)["_errors"])) {
    return (current as { _errors: string[] })._errors;
  }
  return null;
}

/** Convierte posibles respuestas de error (incluido ZodError) a un string seguro */
function normalizeErrorMessage(data: unknown, fallback = "No se pudo crear la orden."): string {
  if (typeof data === "string") return data;

  if (isRecord(data)) {
    // { error: "..." }
    if (typeof data.error === "string") return String(data.error);

    // { error: { _errors: [...] } }
    if (isRecord(data.error) && isStringArray((data.error as StringDict)["_errors"])) {
      return ((data.error as { _errors: string[] })._errors).join(", ");
    }

    // ZodError formateado: { _errors:[], items:{ _errors:[], 0:{id:{_errors:["..."]}} } }
    if ("_errors" in data && isStringArray((data as StringDict)["_errors"])) {
      return ((data as { _errors: string[] })._errors).join(", ");
    }

    const items = (data as StringDict)["items"];
    if (isRecord(items)) {
      if ("_errors" in items && isStringArray((items as StringDict)["_errors"])) {
        return ((items as { _errors: string[] })._errors).join(", ");
      }
      const nested =
        getNestedErrors(items, ["0", "id"]) ??
        getNestedErrors(items, ["1", "id"]) ??
        getNestedErrors(items, ["id"]);
      if (nested && nested.length > 0) return nested.join(", ");
    }

    // Último recurso: stringify
    return safeStringify(data);
  }

  return fallback;
}

export default function CartPage() {
  const { status } = useSession();

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

  // --- Sincronización puntual con servidor (solo si hay sesión) ---
  function syncQtyWithServer(menuItemId: string, qty: number) {
    const tenantId = getLocalTenantId();
    if (status !== "authenticated" || !tenantId) return;
    void fetch("/api/cart/items", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId, menuItemId, qty }),
      cache: "no-store",
    }).catch(() => {});
  }

  function removeFromServer(menuItemId: string) {
    const tenantId = getLocalTenantId();
    if (status !== "authenticated" || !tenantId) return;
    void fetch("/api/cart/items", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId, menuItemId }),
      cache: "no-store",
    }).catch(() => {});
  }

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
      {/* Hidrata/merge automático contra servidor si hay sesión */}
      <CartHydrator />

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
              <QtyControl
                value={it.qty}
                onChange={(q) => {
                  setQty(it.id, q);           // local
                  syncQtyWithServer(it.id, q); // servidor (si hay sesión)
                }}
              />
              <div className="w-24 text-right font-medium">
                {formatMXN(it.price * it.qty)}
              </div>
              <button
                className="text-sm underline"
                onClick={() => {
                  remove(it.id);            // local
                  removeFromServer(it.id);  // servidor (si hay sesión)
                }}
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
              // Obtén tenantId local; si no existe, el backend intentará inferirlo.
              const tenantId = getLocalTenantId();

              const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "content-type": "application/json" },
                // Enviamos tenantId explícito si lo tenemos (más robusto)
                body: JSON.stringify(tenantId ? { tenantId } : {}),
                cache: "no-store",
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
              if (isRecord(data)) {
                if (typeof data.orderId === "string") {
                  orderId = data.orderId;
                } else if (typeof (data as StringDict).id === "string") {
                  orderId = String((data as StringDict).id);
                } else if (
                  isRecord((data as StringDict).order) &&
                  typeof ((data as StringDict).order as StringDict).id === "string"
                ) {
                  orderId = String(((data as StringDict).order as StringDict).id);
                }
              }

              if (!orderId) {
                console.warn("Respuesta inesperada de /api/orders:", data);
                setMsg("La respuesta no incluyó un orderId.");
                setCreating(false);
                return;
              }

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

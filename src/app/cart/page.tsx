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
    if (typeof data.error === "string") return String(data.error);
    if (isRecord(data.error) && isStringArray((data.error as StringDict)["_errors"])) {
      return ((data.error as { _errors: string[] })._errors).join(", ");
    }
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

  // Evitar hydration mismatch
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
      <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
        <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-5 sm:p-6 md:p-8">
            <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight">Carrito</h1>
            <p className="mt-2 text-sm opacity-70">Cargando…</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
      <section className="mx-auto w-full max-w-5xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Hidrata/merge automático contra servidor si hay sesión */}
        <CartHydrator />

        <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-4 sm:p-6 md:p-8">
          <header className="flex items-end justify-between gap-3">
            <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight">Carrito</h1>

            {/* Chip de total visible en mobile para referencia rápida */}
            <div className="sm:hidden inline-flex items-center rounded-full bg-white/80 ring-1 ring-amber-100 px-3 py-1.5 text-xs font-medium shadow-sm">
              Total:&nbsp;<span className="font-semibold tabular-nums">{formatMXN(total)}</span>
            </div>
          </header>

          {/* Lista responsiva */}
          <ul className="mt-4 space-y-3">
            {items.map((it) => (
              <li key={it.id}>
                <article
                  className="
                    grid grid-cols-1 gap-3 rounded-2xl border border-zinc-200 bg-white p-4
                    shadow-sm transition hover:shadow-md focus-within:shadow-md
                    sm:grid-cols-12 sm:items-center sm:gap-4
                  "
                >
                  {/* Nombre + precio unitario */}
                  <div className="min-w-0 sm:col-span-6">
                    <p className="truncate font-semibold text-zinc-900">{it.name}</p>
                    <p className="mt-0.5 text-sm text-zinc-600">{formatMXN(it.price)} c/u</p>
                  </div>

                  {/* Control de cantidad (toca grande en mobile) */}
                  <div className="sm:col-span-3">
                    <QtyControl
                      value={it.qty}
                      onChange={(q) => {
                        setQty(it.id, q);           // local
                        syncQtyWithServer(it.id, q); // servidor (si hay sesión)
                      }}
                    />
                  </div>

                  {/* Total por ítem */}
                  <div className="flex items-center justify-between sm:block sm:text-right sm:col-span-2">
                    <span className="text-sm text-zinc-600 sm:hidden">Total</span>
                    <div className="font-semibold tabular-nums">{formatMXN(it.price * it.qty)}</div>
                  </div>

                  {/* Acción quitar */}
                  <div className="sm:col-span-1 sm:justify-self-end">
                    <button
                      className="
                        w-full sm:w-auto text-xs sm:text-sm underline text-orange-700 hover:text-orange-700/80
                        rounded-md px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                      "
                      onClick={() => {
                        remove(it.id);           // local
                        removeFromServer(it.id); // servidor (si hay sesión)
                      }}
                      type="button"
                    >
                      Quitar
                    </button>
                  </div>
                </article>
              </li>
            ))}

            {items.length === 0 && (
              <li className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-6 text-sm text-zinc-700">
                Tu carrito está vacío.{" "}
                <span className="font-semibold text-orange-700">
                  Agrega platillos para continuar →
                </span>
              </li>
            )}
          </ul>

          {/* Totales y CTA */}
          <div className="mt-5 sm:mt-6 flex flex-col gap-3">
            {/* Total (en desktop se ve aquí; en mobile ya lo mostramos arriba también) */}
            <div className="hidden sm:inline-flex self-end items-center rounded-full bg-white/80 ring-1 ring-amber-100 px-4 py-2 text-sm shadow-sm">
              Total:&nbsp;<span className="font-semibold tabular-nums">{formatMXN(total)}</span>
            </div>

            {msg && (
              <p className="text-sm text-red-600" role="status" aria-live="polite">
                {msg}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
              <button
                type="button"
                className="
                  inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold
                  bg-amber-500 text-white no-underline
                  hover:text-orange-700 hover:bg-orange-50 transition
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                  disabled:opacity-60
                "
                disabled={creating || items.length === 0}
                onClick={async () => {
                  if (creating || items.length === 0) return;
                  setCreating(true);
                  setMsg(null);
                  try {
                    const tenantId = getLocalTenantId();

                    const res = await fetch("/api/orders", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
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
          </div>
        </div>
      </section>
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
    <div
      className="
        inline-flex w-full sm:w-auto items-stretch justify-between gap-0 rounded-xl
        border border-amber-200 bg-white/80 shadow-sm
      "
      role="group"
      aria-label="Cambiar cantidad"
    >
      <button
        className="
          flex-1 sm:flex-none rounded-l-xl border-r border-amber-200 px-3 py-2 text-sm font-medium bg-white
          hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
          active:translate-y-[0.5px]
        "
        onClick={() => onChange(Math.max(1, value - 1))}
        type="button"
        aria-label="Disminuir"
      >
        −
      </button>

      <input
        className="
          w-full sm:w-14 border-0 bg-transparent px-2 text-center text-sm tabular-nums
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
        "
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) && n > 0 ? Math.floor(n) : 1);
        }}
        inputMode="numeric"
        aria-label="Cantidad"
      />

      <button
        className="
          flex-1 sm:flex-none rounded-r-xl border-l border-amber-200 px-3 py-2 text-sm font-medium bg-white
          hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
          active:translate-y-[0.5px]
        "
        onClick={() => onChange(value + 1)}
        type="button"
        aria-label="Aumentar"
      >
        +
      </button>
    </div>
  );
}

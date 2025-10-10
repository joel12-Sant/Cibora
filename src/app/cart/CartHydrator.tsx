"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "@/features/cart/cart-store";
import { getLocalTenantId, setLocalTenantId } from "@/lib/tenant-local";
import type { CartResponse } from "@/lib/cart-types";

/**
 * Sincroniza carrito con servidor sin borrar el local.
 * - Si hay sesión y tenantId:
 *    - con items locales: MERGE y solo actualiza cantidades devueltas
 *    - sin items locales: GET y solo agrega/actualiza cantidades devueltas
 * - Si no hay tenantId:
 *    - intenta /api/cart/latest para obtener tenantId e hidratar (sin borrar local)
 */
export default function CartHydrator() {
  const { status } = useSession();
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);

  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    if (status === "loading") return;

    async function sync() {
      try {
        if (status !== "authenticated") return;

        let tenantId = getLocalTenantId();

        if (!tenantId) {
          // Fallback: pregunta al server el último carrito activo
          const r = await fetch("/api/cart/latest", { cache: "no-store" });
          if (r.ok) {
            const data = (await r.json()) as CartResponse & { tenantId: string | null };
            if (data.tenantId) {
              tenantId = data.tenantId;
              // Hidrata SIN borrar: solo asegura cantidades de lo devuelto
              for (const it of data.items) {
                setQty(it.menuItemId, it.qty);
              }
              setLocalTenantId(data.tenantId);
            }
          }
          // sin tenantId y/o sin items en server → no tocamos el local
          return;
        }

        // Con tenantId…
        if (items.length > 0) {
          // MERGE: si el server devuelve vacío, NO borres el local
          const res = await fetch("/api/cart/merge", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              tenantId,
              items: items.map((it) => ({ menuItemId: it.id, qty: it.qty })),
            }),
            cache: "no-store",
          });
          if (!res.ok) return;
          const data = (await res.json()) as CartResponse;
          if (data.items.length === 0) return; // no destructivo
          for (const it of data.items) {
            setQty(it.menuItemId, it.qty);
          }
        } else {
          // GET: hidrata SIN borrar el local (por si llega tardío)
          const res = await fetch(`/api/cart?tenantId=${tenantId}`, { cache: "no-store" });
          if (!res.ok) return;
          const data = (await res.json()) as CartResponse;
          if (data.items.length === 0) return;
          for (const it of data.items) {
            setQty(it.menuItemId, it.qty);
          }
        }
      } catch {
        // silencioso
      }
    }

    void sync();
  }, [status, items, setQty]);

  return null;
}

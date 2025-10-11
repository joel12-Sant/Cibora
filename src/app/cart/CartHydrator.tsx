"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "@/features/cart/cart-store";
import { getLocalTenantId, setLocalTenantId } from "@/lib/tenant-local";
import type { CartResponse } from "@/lib/cart-types";

export default function CartHydrator() {
  const { status } = useSession();

  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);

  const mergedTenantsRef = useRef<Set<string>>(new Set());

  function upsertFromServer(server: { menuItemId: string; name: string; price: number; qty: number }) {
    const exists = items.some((it) => it.id === server.menuItemId);
    if (exists) {
      setQty(server.menuItemId, server.qty);
    } else {
      add({ id: server.menuItemId, name: server.name, price: server.price }, server.qty);
    }
  }

  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;

    async function runOnceForTenant(tenantId: string) {
      if (mergedTenantsRef.current.has(tenantId)) return;
      mergedTenantsRef.current.add(tenantId);

      try {
        if (items.length > 0) {
          // MERGE idempotente
          const res = await fetch("/api/cart/merge", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              tenantId,
              items: items.map((it) => ({ menuItemId: it.id, qty: it.qty })),
            }),
            cache: "no-store",
          });
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as CartResponse;
          if (cancelled || data.items.length === 0) return;
          for (const it of data.items) upsertFromServer(it);
        } else {
          // Hidratar desde BD
          const res = await fetch(`/api/cart?tenantId=${tenantId}`, { cache: "no-store" });
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as CartResponse;
          if (cancelled || data.items.length === 0) return;
          for (const it of data.items) upsertFromServer(it);
        }
      } catch {
        // noop
      }
    }

    (async () => {
      let tenantId = getLocalTenantId();

      // 1) Si no hay tenantId, prueba el último carrito activo en servidor
      if (!tenantId) {
        try {
          const r = await fetch("/api/cart/latest", { cache: "no-store" });
          if (r.ok) {
            const data = (await r.json()) as CartResponse & { tenantId: string | null };
            if (data.tenantId && !cancelled) {
              tenantId = data.tenantId;
              for (const it of data.items) upsertFromServer(it);
              setLocalTenantId(data.tenantId);
              await runOnceForTenant(data.tenantId);
              return;
            }
          }
        } catch { /* noop */ }
      }

      // 2) Si sigue sin tenantId pero hay items locales, dedúcelo por los items
      if (!tenantId && items.length > 0) {
        try {
          const res = await fetch("/api/cart/detect-tenant", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ items: items.map((i) => ({ menuItemId: i.id })) }),
            cache: "no-store",
          });
          if (res.ok) {
            const data = (await res.json()) as { tenantId: string };
            if (data.tenantId && !cancelled) {
              setLocalTenantId(data.tenantId);
              await runOnceForTenant(data.tenantId);
            }
          }
        } catch { /* noop */ }
        return;
      }

      // 3) Con tenantId conocido, ejecuta merge/hydrate una vez
      if (tenantId) {
        await runOnceForTenant(tenantId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, items, add, setQty]);

  return null;
}

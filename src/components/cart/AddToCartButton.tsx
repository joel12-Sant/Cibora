"use client";

import { useState } from "react";
import { useCart } from "@/features/cart/cart-store";
import { setLocalTenantId } from "@/lib/tenant-local";

type Props = {
  tenantId: string;
  id: string;       // menuItemId en BD
  name: string;
  price: number;    // centavos
  qty?: number;
  className?: string;
  children?: React.ReactNode;
};

export default function AddToCartButton({
  tenantId,
  id,
  name,
  price,
  qty = 1,
  className,
  children,
}: Props) {
  const add = useCart((s) => s.add); // firma: add({ id, name, price }, qty)
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (loading) return;
    setLoading(true);
    try {
      // 1) Guardar tenant
      setLocalTenantId(tenantId);

      // 2) Actualizar local inmediatamente
      add({ id, name, price }, qty);

      // 3) Intentar persistir en servidor (si estás logueado, 200; si no, 401 y no pasa nada)
      void fetch("/api/cart/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId, item: { menuItemId: id, qty } }),
        cache: "no-store",
      }).catch(() => {});
    } finally {
      setTimeout(() => setLoading(false), 120);
    }
  }

  return (
    <button
      type="button"
      className={className ?? "rounded-md border px-3 py-1 text-sm"}
      disabled={loading}
      onClick={handleAdd}
      aria-label={`Agregar ${name} al carrito`}
    >
      {loading ? "Agregando…" : (children ?? "Agregar")}
    </button>
  );
}

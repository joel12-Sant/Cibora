// src/app/cart/ContinueToPayButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ContinueToPayButton({ tenantId }: { tenantId?: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tenantId ? { tenantId } : {}), // si no viene, el server lo infiere
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "No se pudo crear la orden");
        return;
      }
      router.push(`/orders/${data.orderId}/pay`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? "Creando..." : "Continuar al pago"}
    </button>
  );
}

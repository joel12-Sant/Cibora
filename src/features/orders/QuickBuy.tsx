"use client";

import { useState } from "react";

type Props = {
  tenantId: string;
  itemId: string;
};

export default function QuickBuy({ tenantId, itemId }: Props) {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const buy = async () => {
    setLoading(true);
    setOk(null);
    setErr(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenantId,
          items: [{ id: itemId, qty: 1 }],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Order failed");
      setOk(json.order?.id ?? "ok");
    } catch (e: any) {
      setErr(e.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={buy}
        disabled={loading}
        className="rounded-lg border px-4 py-2 hover:bg-white/5 disabled:opacity-50"
      >
        {loading ? "Agregando..." : "Agregar"}
      </button>
      {ok && <span className="text-xs opacity-80">Orden: {ok}</span>}
      {err && <span className="text-xs text-red-400">{err}</span>}
    </div>
  );
}

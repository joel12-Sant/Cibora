// src/components/orders/OrderStatusActions.tsx
"use client";

import { useTransition, useState } from "react";
import type { OrderStatus } from "@prisma/client";

const OPTIONS: OrderStatus[] = [
  "CREATED",
  "PAID",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELED",
];

type Props = {
  orderId: string;
  initialStatus: OrderStatus;
  onChanged?: (status: OrderStatus) => void;
};

export default function OrderStatusActions({ orderId, initialStatus, onChanged }: Props) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [isPending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const update = (next: OrderStatus) => {
    if (next === status) return;
    setErr(null);
    start(async () => {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data?.error ?? "No se pudo actualizar.");
        return;
      }
      const data = (await res.json()) as { order: { status: OrderStatus } };
      setStatus(data.order.status);
      onChanged?.(data.order.status);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => update(e.target.value as OrderStatus)}
        disabled={isPending}
        className="border rounded-md p-1 text-sm"
        aria-label="Cambiar estado"
      >
        {OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {isPending && <span className="text-xs opacity-70">Guardando…</span>}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}

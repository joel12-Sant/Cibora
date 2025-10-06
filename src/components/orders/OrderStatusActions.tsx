"use client";

import { useState, useCallback, useMemo } from "react";
import type { OrderStatus } from "@prisma/client";

type Props = {
  orderId: string;
  initialStatus: OrderStatus;
  onChanged?: (next: OrderStatus) => void; // opcional: para notificar al padre
};

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ["PREPARING", "CANCELED"],
  PAID: ["PREPARING", "CANCELED"],
  PREPARING: ["OUT_FOR_DELIVERY", "CANCELED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELED: [],
};

export default function OrderStatusActions({ orderId, initialStatus, onChanged }: Props) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [loading, setLoading] = useState<string | null>(null);
  const allowed = useMemo(() => ALLOWED[status], [status]);

  const doTransition = useCallback(async (next: OrderStatus) => {
    if (loading) return;
    const prev = status;

    // UI optimista
    setLoading(next);
    setStatus(next);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        // revertir si falla
        setStatus(prev);
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const confirmed = (data?.order?.status ?? next) as OrderStatus;
      setStatus(confirmed);
      onChanged?.(confirmed);
    } catch (err) {
      console.error("status transition error:", err);
      // opcional: toast
      alert(`No se pudo cambiar el estado: ${(err as Error).message}`);
    } finally {
      setLoading(null);
    }
  }, [orderId, status, loading, onChanged]);

  if (ALLOWED[status].length === 0) {
    return <span className="text-sm text-gray-500">Sin acciones</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allowed.includes("PREPARING" as OrderStatus) && (
        <button
          onClick={() => doTransition("PREPARING")}
          disabled={loading !== null}
          className="px-3 py-1 rounded-xl border text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Start preparing
        </button>
      )}
      {allowed.includes("OUT_FOR_DELIVERY" as OrderStatus) && (
        <button
          onClick={() => doTransition("OUT_FOR_DELIVERY")}
          disabled={loading !== null}
          className="px-3 py-1 rounded-xl border text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Send out
        </button>
      )}
      {allowed.includes("DELIVERED" as OrderStatus) && (
        <button
          onClick={() => doTransition("DELIVERED")}
          disabled={loading !== null}
          className="px-3 py-1 rounded-xl border text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Mark delivered
        </button>
      )}
      {allowed.includes("CANCELED" as OrderStatus) && (
        <button
          onClick={() => doTransition("CANCELED")}
          disabled={loading !== null}
          className="px-3 py-1 rounded-xl border text-sm hover:bg-red-50 disabled:opacity-50"
        >
          Cancel
        </button>
      )}
      <span className="ml-2 text-xs text-gray-500">Estado: <strong>{status}</strong></span>
    </div>
  );
}

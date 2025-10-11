"use client";

import { useState, useTransition } from "react";
import { OrderStatus } from "@prisma/client";

type Props = {
  orderId: string;
  initialStatus: OrderStatus;
  onChanged?: (s: OrderStatus) => void;
};

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREATED]: [OrderStatus.PREPARING, OrderStatus.CANCELED],
  [OrderStatus.PREPARING]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELED],
  [OrderStatus.CANCELED]: [],
};

export default function OrderStatusActions({
  orderId,
  initialStatus,
  onChanged,
}: Props) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [isPending, start] = useTransition();

  const nextOptions = NEXT[status] ?? [];

  async function change(to: OrderStatus) {
    start(async () => {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: to }),
      });
      if (!res.ok) {
        // Podrías mostrar un toast aquí
        return;
      }
      const json = (await res.json()) as { order: { status: OrderStatus } };
      setStatus(json.order.status);
      onChanged?.(json.order.status);
    });
  }

  if (nextOptions.length === 0) {
    return <span className="text-sm opacity-70">Sin acciones</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {nextOptions.map((to) => (
        <button
          key={to}
          disabled={isPending}
          onClick={() => void change(to)}
          className="rounded-md border px-2 py-1 text-sm hover:bg-gray-50 disabled:opacity-60"
          title={`Cambiar a ${to}`}
        >
          {to}
        </button>
      ))}
    </div>
  );
}

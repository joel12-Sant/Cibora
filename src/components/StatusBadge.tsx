import { OrderStatus } from "@prisma/client";

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const cls =
    status === "DELIVERED"
      ? "bg-green-100 text-green-800"
      : status === "OUT_FOR_DELIVERY"
      ? "bg-blue-100 text-blue-800"
      : status === "PREPARING"
      ? "bg-yellow-100 text-yellow-800"
      : status === "PAID"
      ? "bg-purple-100 text-purple-800"
      : status === "CREATED"
      ? "bg-gray-100 text-gray-800"
      : "bg-red-100 text-red-800"; // CANCELED

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

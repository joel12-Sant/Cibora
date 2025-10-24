// src/app/dashboard/ItemsTable.tsx
"use client";

import { useRouter } from "next/navigation";
import EditItemModal from "../../../dashboard/menu/EditItemModal";

type Item = {
  id: string;
  name: string;
  price: number;
  active: boolean;
  imageUrl?: string | null;
  description?: string | null;
};

export default function ItemsTable({ items }: { items: Item[] }) {
  const router = useRouter();

  async function toggleActive(id: string) {
    const res = await fetch(`/api/menu/items/${id}`, { method: "PATCH" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error ?? "No se pudo actualizar el ítem");
      return;
    }
    router.refresh();
  }

  async function removeItem(id: string) {
    if (!confirm("¿Eliminar este ítem? Esta acción no se puede deshacer.")) return;
    const res = await fetch(`/api/menu/items/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error ?? "No se pudo eliminar el ítem");
      return;
    }
    router.refresh();
  }

  return (
    <div className="divide-y rounded-2xl border">
      {items.length === 0 && (
        <div className="p-4 text-sm text-gray-500">No hay ítems todavía.</div>
      )}

      {items.map((it) => (
        <div key={it.id} className="flex items-center justify-between p-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{it.name}</div>
            <div className="truncate text-xs text-gray-500">
              ${it.price} MXN {it.active ? "• Activo" : "• Inactivo"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <EditItemModal item={it} />
            <button
              onClick={() => toggleActive(it.id)}
              className="rounded-xl border px-2 py-1 text-xs hover:bg-gray-50"
            >
              {it.active ? "Desactivar" : "Activar"}
            </button>
            <button
              onClick={() => removeItem(it.id)}
              className="rounded-xl border px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

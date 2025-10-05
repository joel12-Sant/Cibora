"use client";
import { useState } from "react";

type Item = { id: string; name: string; price: number; active: boolean };

export default function ItemsTable({ items: initial }: { items: Item[] }) {
  const [items, setItems] = useState(initial);

  async function toggle(id: string) {
    const prev = items;
    const idx = items.findIndex(i => i.id === id);
    if (idx < 0) return;

    const copy = [...items];
    copy[idx] = { ...copy[idx], active: !copy[idx].active };
    setItems(copy);

    const res = await fetch(`/api/menu/items/${id}`, { method: "PATCH" });
    if (!res.ok) {
      // rollback si falla
      setItems(prev);
      alert("No se pudo actualizar el ítem");
    }
  }

  return (
    <ul className="divide-y rounded-xl border">
      {items.map(i => (
        <li key={i.id} className="flex items-center justify-between p-3">
          <div>
            <p className="font-medium">{i.name}</p>
            <p className="text-sm opacity-70">${i.price} MXN</p>
          </div>
          <button
            className="rounded border px-3 py-1.5 hover:bg-white/5"
            onClick={() => toggle(i.id)}
          >
            {i.active ? "Desactivar" : "Activar"}
          </button>
        </li>
      ))}
      {items.length === 0 && <li className="p-3 opacity-70">Sin items.</li>}
    </ul>
  );
}

"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { formatMXN } from "@/lib/money";

type Item = {
  id: string;
  name: string;
  price: number;
  active: boolean;
  imageUrl?: string | null;
  description?: string | null;
};

type MenuData = {
  id: string;
  name: string;
  items: Item[];
};

const itemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(120, "Máximo 120 caracteres"),
  price: z
    .coerce.number()
    .int("Debe ser entero")
    .nonnegative("Precio inválido"),
  active: z.boolean().optional(),
  imageUrl: z
    .string()
    .trim()
    .url("URL inválida")
    .max(2048)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  description: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// helper de tipo seguro
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeErrorMessage(data: unknown, fallback = "Ocurrió un error."): string {
  if (typeof data === "string") return data;
  if (isRecord(data)) {
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string") return err;

    const details = (data as { details?: { fieldErrors?: Record<string, string[]> } }).details;
    const fe = details?.fieldErrors;
    const first = fe ? Object.values(fe)[0]?.[0] : undefined;
    if (first) return first;
  }
  return fallback;
}

export default function MenuItemsManager({ initialMenu }: { initialMenu: MenuData }) {
  const [items, setItems] = useState<Item[]>(initialMenu.items);
  const [form, setForm] = useState<{
    name: string;
    price: string;
    imageUrl: string;
    description: string;
    active: boolean;
  }>({
    name: "",
    price: "",
    imageUrl: "",
    description: "",
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string | undefined>>({});

  // Edición inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    name: string;
    price: string;
    imageUrl: string;
    description: string;
    active: boolean;
  }>({
    name: "",
    price: "",
    imageUrl: "",
    description: "",
    active: true,
  });
  const [editing, setEditing] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editFieldErr, setEditFieldErr] = useState<Record<string, string | undefined>>({});

  // 🔁 Re-sincroniza estado cuando cambia el menú seleccionado
  useEffect(() => {
    setItems(initialMenu.items);
    setEditingId(null);
    setEditErr(null);
    setEditFieldErr({});
    setEditing(false);
    setForm({ name: "", price: "", imageUrl: "", description: "", active: true });
  }, [initialMenu.id, initialMenu.items]);

  async function createItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormErr(null);
    setFieldErr({});
    const parsed = itemSchema.safeParse({
      name: form.name,
      price: form.price,
      imageUrl: form.imageUrl,
      description: form.description,
      active: form.active,
    });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setFieldErr({
        name: f.name?.[0],
        price: f.price?.[0],
        imageUrl: f.imageUrl?.[0],
        description: f.description?.[0],
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/menus/${initialMenu.id}/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
        cache: "no-store",
      });

      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        // respuesta sin body
      }

      if (!res.ok) {
        setFormErr(normalizeErrorMessage(data, "No se pudo crear el ítem."));
        return;
      }

      const newId =
        isRecord(data) && typeof (data as Record<string, unknown>).id === "string"
          ? (data as { id: string }).id
          : undefined;

      const created: Item = {
        id: newId ?? crypto.randomUUID(),
        name: parsed.data.name,
        price: parsed.data.price,
        active: parsed.data.active ?? true,
        imageUrl: parsed.data.imageUrl,
        description: parsed.data.description,
      };
      setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: "", price: "", imageUrl: "", description: "", active: true });
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(it: Item) {
    setEditingId(it.id);
    setEditData({
      name: it.name,
      price: String(it.price),
      imageUrl: it.imageUrl ?? "",
      description: it.description ?? "",
      active: it.active,
    });
    setEditErr(null);
    setEditFieldErr({});
  }

  function cancelEdit() {
    setEditingId(null);
    setEditErr(null);
    setEditFieldErr({});
    setEditing(false);
  }

  async function patchItem(it: Item, payload: Partial<Item>) {
    const res = await fetch(`/api/menus/${initialMenu.id}/items/${it.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      // sin body
    }
    if (!res.ok) throw new Error(normalizeErrorMessage(data, "No se pudo actualizar el ítem."));
    return true;
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditing(true);
    setEditErr(null);
    setEditFieldErr({});

    const parsed = itemSchema
      .partial()
      .extend({
        name: itemSchema.shape.name.optional(),
        price: itemSchema.shape.price.optional(),
      })
      .safeParse({
        name: editData.name,
        price: editData.price,
        imageUrl: editData.imageUrl,
        description: editData.description,
        active: editData.active,
      });

    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setEditFieldErr({
        name: f.name?.[0],
        price: f.price?.[0],
        imageUrl: f.imageUrl?.[0],
        description: f.description?.[0],
      });
      setEditing(false);
      return;
    }

    try {
      await patchItem({ id: editingId } as Item, parsed.data as Partial<Item>);

      setItems((prev) =>
        prev
          .map((x) =>
            x.id === editingId
              ? {
                  ...x,
                  ...parsed.data,
                  price: parsed.data.price !== undefined ? Number(parsed.data.price) : x.price,
                }
              : x
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      cancelEdit();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo actualizar el ítem.";
      setEditErr(msg);
      setEditing(false);
    }
  }

  async function toggleActive(it: Item) {
    try {
      await patchItem(it, { active: !it.active });
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, active: !x.active } : x)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo actualizar el estado.";
      alert(msg);
    }
  }

  async function deleteItem(it: Item) {
    if (!confirm(`¿Eliminar "${it.name}"?`)) return;
    const res = await fetch(`/api/menus/${initialMenu.id}/items/${it.id}`, {
      method: "DELETE",
      cache: "no-store",
    });
    if (!res.ok) {
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        // sin body
      }
      alert(normalizeErrorMessage(data, "No se pudo eliminar el ítem."));
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== it.id));
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Crear ítem */}
      <section className="rounded-2xl border border-amber-100 bg-white/90 p-4 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Agregar ítem</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Completa los campos para añadir un nuevo platillo a{" "}
          <span className="font-medium">{initialMenu.name}</span>.
        </p>

        {formErr && (
          <div
            className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 ring-1 ring-rose-100"
            role="alert"
            aria-live="polite"
          >
            {formErr}
          </div>
        )}

        <form onSubmit={createItem} className="mt-4 grid grid-cols-1 gap-3" noValidate>
          <div>
            <label className="block text-sm">Nombre *</label>
            <input
              className={`mt-1 w-full rounded-xl border px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                fieldErr.name ? "border-red-500" : "border-zinc-300"
              }`}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              aria-invalid={Boolean(fieldErr.name)}
              placeholder="Taco al pastor"
            />
            {fieldErr.name && <p className="mt-1 text-xs text-red-600">{fieldErr.name}</p>}
          </div>

          <div>
            <label className="block text-sm">Precio (centavos) *</label>
            <input
              type="number"
              inputMode="numeric"
              className={`mt-1 w-full rounded-xl border px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                fieldErr.price ? "border-red-500" : "border-zinc-300"
              }`}
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              aria-invalid={Boolean(fieldErr.price)}
              placeholder="12000"
            />
            {fieldErr.price && <p className="mt-1 text-xs text-red-600">{fieldErr.price}</p>}
            <p className="mt-1 text-xs text-zinc-500">Se guarda en centavos. Ej: 12000 = {formatMXN(12000)}</p>
          </div>

          <div>
            <label className="block text-sm">Imagen (URL opcional)</label>
            <input
              className={`mt-1 w-full rounded-xl border px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                fieldErr.imageUrl ? "border-red-500" : "border-zinc-300"
              }`}
              value={form.imageUrl}
              onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
              aria-invalid={Boolean(fieldErr.imageUrl)}
              placeholder="https://..."
            />
            {fieldErr.imageUrl && <p className="mt-1 text-xs text-red-600">{fieldErr.imageUrl}</p>}
          </div>

          <div>
            <label className="block text-sm">Descripción (opcional)</label>
            <textarea
              rows={3}
              className={`mt-1 w-full rounded-xl border px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                fieldErr.description ? "border-red-500" : "border-zinc-300"
              }`}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              aria-invalid={Boolean(fieldErr.description)}
              placeholder="Tortilla de maíz, cerdo marinado, piña, cebolla y cilantro."
            />
            {fieldErr.description && <p className="mt-1 text-xs text-red-600">{fieldErr.description}</p>}
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
            />
            Activo
          </label>

          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold
                         bg-amber-500 text-white transition
                         hover:text-orange-700 hover:bg-orange-50
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                         disabled:opacity-60"
            >
              {submitting ? "Agregando…" : "Agregar ítem"}
            </button>
          </div>
        </form>
      </section>

      {/* Lista y edición de ítems */}
      <section className="rounded-2xl border border-amber-100 bg-white/90 p-4 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Ítems del menú</h2>

        <ul className="mt-4 grid grid-cols-1 gap-3">
          {items.map((it) => (
            <li key={it.id}>
              <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                {editingId === it.id ? (
                  <form onSubmit={submitEdit} className="grid grid-cols-1 gap-3" noValidate>
                    {editErr && (
                      <div
                        className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 ring-1 ring-rose-100"
                        role="alert"
                        aria-live="polite"
                      >
                        {editErr}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm">Nombre *</label>
                        <input
                          className={`mt-1 w-full rounded-xl border px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                            editFieldErr.name ? "border-red-500" : "border-zinc-300"
                          }`}
                          value={editData.name}
                          onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                          aria-invalid={Boolean(editFieldErr.name)}
                        />
                        {editFieldErr.name && <p className="mt-1 text-xs text-red-600">{editFieldErr.name}</p>}
                      </div>
                      <div>
                        <label className="block text-sm">Precio (centavos) *</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          className={`mt-1 w-full rounded-xl border px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                            editFieldErr.price ? "border-red-500" : "border-zinc-300"
                          }`}
                          value={editData.price}
                          onChange={(e) => setEditData((p) => ({ ...p, price: e.target.value }))}
                          aria-invalid={Boolean(editFieldErr.price)}
                        />
                        {editFieldErr.price && <p className="mt-1 text-xs text-red-600">{editFieldErr.price}</p>}
                        <p className="mt-1 text-xs text-zinc-500">
                          {editData.price ? formatMXN(Number(editData.price)) : ""}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm">Imagen (URL)</label>
                        <input
                          className={`mt-1 w-full rounded-xl border px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                            editFieldErr.imageUrl ? "border-red-500" : "border-zinc-300"
                          }`}
                          value={editData.imageUrl}
                          onChange={(e) => setEditData((p) => ({ ...p, imageUrl: e.target.value }))}
                          aria-invalid={Boolean(editFieldErr.imageUrl)}
                        />
                        {editFieldErr.imageUrl && <p className="mt-1 text-xs text-red-600">{editFieldErr.imageUrl}</p>}
                      </div>
                      <div>
                        <label className="block text-sm">Descripción</label>
                        <input
                          className={`mt-1 w-full rounded-xl border px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                            editFieldErr.description ? "border-red-500" : "border-zinc-300"
                          }`}
                          value={editData.description}
                          onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))}
                          aria-invalid={Boolean(editFieldErr.description)}
                        />
                        {editFieldErr.description && (
                          <p className="mt-1 text-xs text-red-600">{editFieldErr.description}</p>
                        )}
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editData.active}
                        onChange={(e) => setEditData((p) => ({ ...p, active: e.target.checked }))}
                      />
                      Activo
                    </label>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium
                                   bg-zinc-100 text-zinc-800 hover:bg-zinc-200
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={editing}
                        className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold
                                   bg-amber-500 text-white transition
                                   hover:text-orange-700 hover:bg-orange-50
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                                   disabled:opacity-60"
                      >
                        {editing ? "Guardando…" : "Guardar cambios"}
                      </button>
                    </div>
                  </form>
                ) : (
                  // Vista normal del ítem
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900">
                        {it.name}
                        {!it.active && (
                          <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 ring-1 ring-zinc-200">
                            inactivo
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-zinc-600">
                        {formatMXN(it.price)}
                        {it.description ? (
                          <>
                            <span className="mx-2 text-zinc-400">•</span>
                            <span className="line-clamp-1">{it.description}</span>
                          </>
                        ) : null}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(it)}
                        className="text-sm underline text-zinc-700 hover:text-orange-700 rounded-md px-2 py-1
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => toggleActive(it)}
                        className="text-sm underline text-orange-700 hover:text-orange-700/80 rounded-md px-2 py-1
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                      >
                        {it.active ? "Desactivar" : "Activar"}
                      </button>

                      <button
                        onClick={() => deleteItem(it)}
                        className="text-sm underline text-rose-700 hover:text-rose-700/80 rounded-md px-2 py-1
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </article>
            </li>
          ))}

          {items.length === 0 && (
            <li className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-6 text-sm text-zinc-700">
              Aún no hay ítems en este menú.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

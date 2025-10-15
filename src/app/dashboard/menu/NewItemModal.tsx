// src/app/dashboard/menu/NewItemModal.tsx
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { uploadImage } from "@/lib/uploads";

export default function NewItemModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const preview = useMemo(() => {
    if (file) return URL.createObjectURL(file);
    if (imageUrl) return imageUrl;
    return "";
  }, [file, imageUrl]);

  async function onUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setImageUrl(url);
    } catch (e) {
      alert("No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/menu/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          price: typeof price === "string" ? Number(price) : price,
          active,
          imageUrl: imageUrl || undefined,
          description: description || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ? JSON.stringify(data.error) : "No se pudo crear el ítem");
        return;
      }
      setOpen(false);
      setName("");
      setPrice("");
      setActive(true);
      setImageUrl("");
      setFile(null);
      setDescription("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-gray-50"
      >
        Nuevo ítem
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Crear ítem</h2>
              <button onClick={() => setOpen(false)} className="text-sm opacity-60 hover:opacity-100">
                Cerrar
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="block text-sm">Nombre</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm">Precio (MXN)</label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={price}
                    onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    required
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                    Activo
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm">Imagen</label>
                {preview ? (
                  <img
                    src={preview}
                    alt="preview"
                    className="h-24 w-24 rounded-lg object-cover ring-1 ring-gray-200"
                  />
                ) : null}

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={onUpload}
                    disabled={!file || uploading}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {uploading ? "Subiendo..." : "Subir"}
                  </button>
                </div>

                <div>
                  <label className="block text-xs text-gray-500">
                    o pega una URL (opcional)
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm">Descripción</label>
                <textarea
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

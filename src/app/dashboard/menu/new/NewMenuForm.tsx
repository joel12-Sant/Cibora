"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

/** Zod client-side para UX inmediata */
const menuSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "Máximo 100 caracteres"),
});

/** Helper: type guard para objetos */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Normaliza respuestas { error, details.fieldErrors } del backend */
function normalizeErrorMessage(
  data: unknown,
  fallback = "No se pudo crear el menú."
): {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} {
  if (typeof data === "string") return { error: data };
  if (isRecord(data)) {
    const err = (data as { error?: unknown }).error;
    const details = (data as { details?: { fieldErrors?: Record<string, string[]> } }).details;

    if (typeof err === "string") {
      return { error: err, fieldErrors: details?.fieldErrors };
    }
    if (details?.fieldErrors) {
      return { error: fallback, fieldErrors: details.fieldErrors };
    }
  }
  return { error: fallback };
}

/** Extrae id de { id } | { menuId } | { menu:{id} } */
function extractMenuId(payload: unknown): string | null {
  if (!isRecord(payload)) return null;

  if (typeof (payload as Record<string, unknown>).id === "string") {
    return (payload as { id: string }).id;
  }
  if (typeof (payload as Record<string, unknown>).menuId === "string") {
    return (payload as { menuId: string }).menuId;
  }
  const menu = (payload as { menu?: unknown }).menu;
  if (isRecord(menu) && typeof (menu as Record<string, unknown>).id === "string") {
    return (menu as { id: string }).id;
  }
  return null;
}

export default function NewMenuForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string | undefined>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormErr(null);
    setFieldErr({});

    const parsed = menuSchema.safeParse({ name });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setFieldErr({
        name: f.name?.[0],
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/menus", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // El backend puede inferir tenantId por sesión; si prefieres, añade tenantId aquí.
        body: JSON.stringify({ name: parsed.data.name }),
        cache: "no-store",
      });

      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        // respuesta sin body
      }

      if (!res.ok) {
        const { error, fieldErrors } = normalizeErrorMessage(data);
        if (fieldErrors?.name?.[0]) {
          setFieldErr((p) => ({ ...p, name: fieldErrors.name[0] }));
        }
        setFormErr(error ?? "No se pudo crear el menú.");
        return;
      }

      const newId = extractMenuId(data);
      if (!newId) {
        setFormErr("La respuesta no incluyó el id del menú.");
        return;
      }

      // Redirige a “Gestionar menú”
      router.replace(`/dashboard/menu/${newId}`);
      router.refresh();
    } catch {
      setFormErr("No se pudo crear el menú.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className="block text-sm">
          Nombre del menú *
        </label>
        <input
          id="name"
          name="name"
          className={`mt-1 w-full rounded-xl border px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
            fieldErr.name ? "border-red-500" : "border-zinc-300"
          }`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Desayunos, Comidas, Bebidas..."
          aria-invalid={Boolean(fieldErr.name)}
          maxLength={100}
          autoFocus
        />
        {fieldErr.name && <p className="mt-1 text-xs text-red-600">{fieldErr.name}</p>}
        <p className="mt-1 text-xs text-zinc-500">
          Puedes crear varios menús (por ejemplo: “Desayunos”, “Comidas”, “Promos”).
        </p>
      </div>

      {formErr && (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 ring-1 ring-rose-100"
          role="alert"
          aria-live="polite"
        >
          {formErr}
        </div>
      )}

      <div className="pt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium
                     bg-zinc-100 text-zinc-800 hover:bg-zinc-200
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold
                     bg-amber-500 text-white transition
                     hover:text-orange-700 hover:bg-orange-50
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                     disabled:opacity-60"
        >
          {submitting ? "Creando…" : "Crear menú"}
        </button>
      </div>
    </form>
  );
}

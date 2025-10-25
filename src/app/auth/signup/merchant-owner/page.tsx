// src/app/auth/signup/merchant-owner/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const addressSchema = z.object({
  label: z.string().optional(),
  line1: z
    .string()
    .trim()
    .min(5, "Calle y número requeridos")
    .refine((v) => /\d/.test(v), {
      message: "Incluye el número exterior, p. ej. “Av. Reforma 123”.",
    }),
  line2: z.string().optional(),
  city: z.string().trim().min(2, "Ciudad requerida"),
  state: z.string().optional(),
  postalCode: z.string().trim().min(3, "Código postal requerido"),
  country: z.string().trim().min(2, "País requerido"),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

// ✅ Usamos .trim() (no .transform) para poder encadenar .min/.max/.url
const formSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  // Permitir vacío "" en opcionales
  description: z.union([z.string().trim().max(500, "Máximo 500 caracteres"), z.literal("")]).optional(),
  imageUrl: z
    .union([z.string().trim().url("URL inválida").max(2048, "URL muy larga"), z.literal("")])
    .optional(),
  useAddress: z.boolean().optional(),
  address: addressSchema.optional(),
});

type FormData = z.infer<typeof formSchema>;
type FieldErrors = Partial<Record<keyof FormData, string>> & {
  "address.line1"?: string;
  "address.city"?: string;
  "address.postalCode"?: string;
  "address.country"?: string;
};

export default function MerchantOwnerStep() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [values, setValues] = useState<FormData>({
    name: "",
    description: "",
    imageUrl: "",
    useAddress: false,
    address: undefined,
  });

  function set<K extends keyof FormData>(key: K, val: FormData[K]) {
    setValues((p) => ({ ...p, [key]: val }));
  }
  function setAddr<K extends keyof NonNullable<FormData["address"]>>(
    key: K,
    val: NonNullable<FormData["address"]>[K]
  ) {
    setValues((p) => ({ ...p, address: { ...(p.address ?? {}), [key]: val } as any }));
  }

  function clearErrors() {
    setErrors({});
    setTopError(null);
  }

  function mapServerFieldErrors(details: any): FieldErrors {
    const fe: FieldErrors = {};
    const fld = details?.fieldErrors ?? {};
    const flat = (k: string) => (Array.isArray(fld[k]) ? fld[k][0] : undefined);

    fe.name = flat("name");
    fe.description = flat("description");
    fe.imageUrl = flat("imageUrl");
    fe["address.line1"] = flat("address.line1") ?? flat("line1");
    fe["address.city"] = flat("address.city") ?? flat("city");
    fe["address.postalCode"] = flat("address.postalCode") ?? flat("postalCode");
    fe["address.country"] = flat("address.country") ?? flat("country");
    return fe;
  }

  function buildPayload(v: FormData) {
    const clean = (s?: string | null) => (s && s.trim() !== "" ? s.trim() : undefined);

    const addr = v.useAddress
      ? {
        label: clean(v.address?.label as any),
        line1: clean(v.address?.line1 as any),
        line2: clean(v.address?.line2 as any),
        city: clean(v.address?.city as any),
        state: clean(v.address?.state as any),
        postalCode: clean(v.address?.postalCode as any),
        country: clean(v.address?.country as any),
        latitude: v.address?.latitude,
        longitude: v.address?.longitude,
      }
      : undefined;

    const hasAnyAddr = addr
      ? Object.values(addr).some((x) => x !== undefined && x !== null && x !== "")
      : false;

    return {
      name: clean(v.name),
      description: clean(v.description as any),
      imageUrl: clean(v.imageUrl as any),
      ...(v.useAddress && hasAnyAddr ? { address: addr } : {}),
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearErrors();

    const toValidate: FormData = {
      ...values,
      address: values.useAddress ? values.address : undefined,
    };
    const result = formSchema.safeParse(toValidate);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      const pick = (k: string) => flat[k]?.[0];
      const mapped: FieldErrors = {
        name: pick("name"),
        description: pick("description"),
        imageUrl: pick("imageUrl"),
        "address.line1": pick("address.line1") ?? pick("line1"),
        "address.city": pick("address.city") ?? pick("city"),
        "address.postalCode": pick("address.postalCode") ?? pick("postalCode"),
        "address.country": pick("address.country") ?? pick("country"),
      };
      setErrors(mapped);
      return;
    }

    const payload = buildPayload(result.data);

    setLoading(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        if (data?.details?.fieldErrors) {
          setErrors(mapServerFieldErrors(data.details));
        }
        setTopError(
          data?.error ||
          (res.status === 403
            ? "No tienes permiso para crear un restaurante."
            : res.status === 409
              ? "Ese nombre ya está en uso."
              : "No se pudo crear el restaurante.")
        );
        console.error("[create tenant] status:", res.status, "payload:", payload, "server:", data);
        return;
      }

      router.replace("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
      <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-6 sm:p-8">
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Crear restaurante</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Define tu marca y (opcional) la dirección principal.
          </p>

          {topError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {topError}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
            <div>
              <label className="block text-sm">Nombre *</label>
              <input
                className={`mt-1 w-full rounded-xl border px-3 py-2 ${errors.name ? "border-red-500" : "border-zinc-300"
                  }`}
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm">Descripción (opcional)</label>
              <textarea
                className={`mt-1 w-full rounded-xl border px-3 py-2 ${errors.description ? "border-red-500" : "border-zinc-300"
                  }`}
                rows={3}
                value={values.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600">{errors.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm">Imagen (URL opcional)</label>
              <input
                className={`mt-1 w-full rounded-xl border px-3 py-2 ${errors.imageUrl ? "border-red-500" : "border-zinc-300"
                  }`}
                placeholder="https://..."
                value={values.imageUrl ?? ""}
                onChange={(e) => set("imageUrl", e.target.value)}
              />
              {errors.imageUrl && (
                <p className="mt-1 text-xs text-red-600">{errors.imageUrl}</p>
              )}
            </div>

            <div className="pt-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(values.useAddress)}
                  onChange={(e) => {
                    set("useAddress", e.target.checked);
                    if (!e.target.checked) set("address", undefined);
                    else set("address", values.address ?? ({} as any));
                  }}
                />
                Agregar dirección principal ahora
              </label>
            </div>

            {values.useAddress && (
              <div className="grid grid-cols-1 gap-4 rounded-2xl border p-4">
                <div>
                  <label className="block text-sm">Etiqueta (opcional)</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
                    placeholder="Sucursal Centro"
                    value={values.address?.label ?? ""}
                    onChange={(e) => setAddr("label", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm">Calle y número *</label>
                  <input
                    className={`mt-1 w-full rounded-xl border px-3 py-2 ${errors["address.line1"] ? "border-red-500" : "border-zinc-300"
                      }`}
                    placeholder="Av. Reforma 123"
                    value={values.address?.line1 ?? ""}
                    onChange={(e) => setAddr("line1", e.target.value)}
                    aria-invalid={Boolean(errors["address.line1"])}
                  />
                  {errors["address.line1"] && (
                    <p className="mt-1 text-xs text-red-600">{errors["address.line1"]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm">Ciudad *</label>
                  <input
                    className={`mt-1 w-full rounded-xl border px-3 py-2 ${errors["address.city"] ? "border-red-500" : "border-zinc-300"
                      }`}
                    value={values.address?.city ?? ""}
                    onChange={(e) => setAddr("city", e.target.value)}
                  />
                  {errors["address.city"] && (
                    <p className="mt-1 text-xs text-red-600">{errors["address.city"]}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm">Código postal *</label>
                    <input
                      className={`mt-1 w-full rounded-xl border px-3 py-2 ${errors["address.postalCode"]
                          ? "border-red-500"
                          : "border-zinc-300"
                        }`}
                      value={values.address?.postalCode ?? ""}
                      onChange={(e) => setAddr("postalCode", e.target.value)}
                    />
                    {errors["address.postalCode"] && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors["address.postalCode"]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm">País *</label>
                    <input
                      className={`mt-1 w-full rounded-xl border px-3 py-2 ${errors["address.country"] ? "border-red-500" : "border-zinc-300"
                        }`}
                      value={values.address?.country ?? ""}
                      onChange={(e) => setAddr("country", e.target.value)}
                    />
                    {errors["address.country"] && (
                      <p className="mt-1 text-xs text-red-600">{errors["address.country"]}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm">Estado / Provincia (opcional)</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
                      value={values.address?.state ?? ""}
                      onChange={(e) => setAddr("state", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm">Colonia / Depto / Ref. (opcional)</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
                      value={values.address?.line2 ?? ""}
                      onChange={(e) => setAddr("line2", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold
                           bg-amber-500 text-white hover:text-orange-700 hover:bg-orange-50
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                           disabled:opacity-60"
              >
                {loading ? "Creando..." : "Crear restaurante"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

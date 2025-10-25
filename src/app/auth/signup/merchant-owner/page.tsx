"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

// ====== Esquemas de validación ======
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

const formSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.union([z.string().trim().max(500, "Máximo 500 caracteres"), z.literal("")]).optional(),
  imageUrl: z.union([z.string().trim().url("URL inválida").max(2048, "URL muy larga"), z.literal("")]).optional(),
  useAddress: z.boolean().optional(),
  address: addressSchema.optional(),
});

type FormDataZ = z.infer<typeof formSchema>;
type AddressZ = z.infer<typeof addressSchema>;

// ====== Tipos de Estado de UI (permite vacíos sin 'any') ======
type AddressDraft = Partial<{
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
}>;

type FormDraft = {
  name: string;
  description?: string;
  imageUrl?: string;
  useAddress: boolean;
  address?: AddressDraft;
};

// ====== Tipos auxiliares ======
type FieldErrors = {
  name?: string;
  description?: string;
  imageUrl?: string;
  "address.line1"?: string;
  "address.city"?: string;
  "address.postalCode"?: string;
  "address.country"?: string;
  [key: string]: string | undefined;
};

type ApiErrorDetails = {
  fieldErrors?: Record<string, string[]>;
};

type ApiErrorPayload = {
  error?: string;
  details?: ApiErrorDetails;
};

type CreateTenantOk = {
  ok: true;
  tenant?: { id: string };
};

export default function MerchantOwnerStep() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [values, setValues] = useState<FormDraft>({
    name: "",
    description: "",
    imageUrl: "",
    useAddress: false,
    address: undefined,
  });

  // ====== Setters tipados ======
  function set<K extends keyof FormDraft>(key: K, val: FormDraft[K]) {
    setValues((p) => ({ ...p, [key]: val }));
  }
  function setAddr<K extends keyof AddressDraft>(key: K, val: AddressDraft[K]) {
    setValues((p) => ({ ...p, address: { ...(p.address ?? {}), [key]: val } }));
  }

  function clearErrors() {
    setErrors({});
    setTopError(null);
  }

  function mapServerFieldErrors(details: ApiErrorDetails | undefined): FieldErrors {
    const fe: FieldErrors = {};
    const fld = details?.fieldErrors ?? {};
    const pick = (k: string): string | undefined => (Array.isArray(fld[k]) ? fld[k][0] : undefined);

    fe.name = pick("name");
    fe.description = pick("description");
    fe.imageUrl = pick("imageUrl");
    fe["address.line1"] = pick("address.line1") ?? pick("line1");
    fe["address.city"] = pick("address.city") ?? pick("city");
    fe["address.postalCode"] = pick("address.postalCode") ?? pick("postalCode");
    fe["address.country"] = pick("address.country") ?? pick("country");
    return fe;
  }

  // Construye payload limpio para API
  function buildPayload(v: FormDraft): {
    name: string;
    description?: string;
    imageUrl?: string;
    address?: Partial<AddressZ>;
  } {
    const clean = (s?: string) => (s && s.trim() !== "" ? s.trim() : undefined);

    const addrDraft = v.useAddress ? v.address : undefined;
    const addr: Partial<AddressZ> | undefined = addrDraft
      ? {
          label: clean(addrDraft.label),
          line1: clean(addrDraft.line1),
          line2: clean(addrDraft.line2),
          city: clean(addrDraft.city),
          state: clean(addrDraft.state),
          postalCode: clean(addrDraft.postalCode),
          country: clean(addrDraft.country),
          latitude: addrDraft.latitude,
          longitude: addrDraft.longitude,
        }
      : undefined;

    const hasAnyAddr =
      addr &&
      Object.values(addr).some((x) => x !== undefined && x !== null && x !== "");

    return {
      name: clean(v.name) ?? "",
      description: clean(v.description),
      imageUrl: clean(v.imageUrl),
      ...(v.useAddress && hasAnyAddr ? { address: addr } : {}),
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearErrors();

    // Construimos el objeto que sí valida Zod (sin Address vacío)
    const toValidate: FormDataZ = {
      name: values.name,
      description: values.description,
      imageUrl: values.imageUrl,
      useAddress: values.useAddress,
      address: values.useAddress
        ? ({
            label: values.address?.label,
            line1: values.address?.line1 ?? "",
            line2: values.address?.line2,
            city: values.address?.city ?? "",
            state: values.address?.state,
            postalCode: values.address?.postalCode ?? "",
            country: values.address?.country ?? "",
            latitude: values.address?.latitude,
            longitude: values.address?.longitude,
          } as AddressZ)
        : undefined,
    };

    // Validación con Zod
    const result = formSchema.safeParse(toValidate);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors as Record<
        string,
        string[] | undefined
      >;
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

    const payload = buildPayload(values);

    setLoading(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: CreateTenantOk | ApiErrorPayload | null = null;
      try {
        data = (await res.json()) as CreateTenantOk | ApiErrorPayload;
      } catch {
        data = null;
      }

      if (!res.ok) {
        const details = (data as ApiErrorPayload | null)?.details;
        if (details?.fieldErrors) {
          setErrors(mapServerFieldErrors(details));
        }
        setTopError(
          (data as ApiErrorPayload | null)?.error ??
            (res.status === 403
              ? "No tienes permiso para crear un restaurante."
              : res.status === 409
              ? "Ese nombre ya está en uso."
              : "No se pudo crear el restaurante.")
        );
        return;
      }

      // OK
      router.replace("/dashboard");
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
                className={`mt-1 w-full rounded-xl border px-3 py-2 ${
                  errors.name ? "border-red-500" : "border-zinc-300"
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
                className={`mt-1 w-full rounded-xl border px-3 py-2 ${
                  errors.description ? "border-red-500" : "border-zinc-300"
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
                className={`mt-1 w-full rounded-xl border px-3 py-2 ${
                  errors.imageUrl ? "border-red-500" : "border-zinc-300"
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
                    const checked = e.target.checked;
                    set("useAddress", checked);
                    if (!checked) {
                      set("address", undefined);
                    } else {
                      set("address", values.address ?? {});
                    }
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
                    className={`mt-1 w-full rounded-xl border px-3 py-2 ${
                      errors["address.line1"] ? "border-red-500" : "border-zinc-300"
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
                    className={`mt-1 w-full rounded-xl border px-3 py-2 ${
                      errors["address.city"] ? "border-red-500" : "border-zinc-300"
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
                      className={`mt-1 w-full rounded-xl border px-3 py-2 ${
                        errors["address.postalCode"]
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
                      className={`mt-1 w-full rounded-xl border px-3 py-2 ${
                        errors["address.country"] ? "border-red-500" : "border-zinc-300"
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

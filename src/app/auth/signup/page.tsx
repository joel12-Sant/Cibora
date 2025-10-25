"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { z } from "zod";

type RoleKey = "CUSTOMER" | "COURIER" | "MERCHANT_OWNER" | "MERCHANT_STAFF";

const tenantSchema = z.object({
  name: z.string().trim().min(2, "El nombre del restaurante debe tener al menos 2 caracteres"),
  description: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
  imageUrl: z.string().trim().url("URL inválida").max(2048).optional(),
});

export default function SignUpPage() {
  const router = useRouter();

  // user
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleKey>("CUSTOMER");

  // tenant (sólo si elige dueño)
  const [tName, setTName] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [tImage, setTImage] = useState("");

  const [loading, setLoading] = useState(false);

  // Errores simples en cliente (UX)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function clearErrors() {
    setErrors({});
  }

  function destinationByRole(r: RoleKey, createdTenantId?: string | null) {
    if (r === "MERCHANT_OWNER") {
      // si ya creamos tenant en el registro -> directo al dashboard
      if (createdTenantId) return "/dashboard";
      // si no se mandó bloque del restaurante, vamos al paso 2
      return "/auth/signup/merchant-owner";
    }
    if (r === "COURIER") return "/auth/signup/courier";
    if (r === "MERCHANT_STAFF") return "/auth/signup/merchant-staff";
    return "/"; // CUSTOMER
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearErrors();

    // Validación ligera en cliente (no sustituye la del servidor)
    if (name.trim().length < 2) {
      setErrors((p) => ({ ...p, name: "Tu nombre debe tener al menos 2 caracteres" }));
      return;
    }
    if (password.length < 6) {
      setErrors((p) => ({ ...p, password: "La contraseña debe tener al menos 6 caracteres" }));
      return;
    }

    // si es dueño y llenó "Nombre del restaurante", validamos ese bloque
    let tenantPayload:
      | { name: string; description?: string; imageUrl?: string }
      | undefined = undefined;

    if (role === "MERCHANT_OWNER" && tName.trim() !== "") {
      const tParse = tenantSchema.safeParse({
        name: tName,
        description: tDesc || undefined,
        imageUrl: tImage || undefined,
      });
      if (!tParse.success) {
        const f = tParse.error.flatten().fieldErrors as Record<string, string[] | undefined>;
        setErrors({
          tName: f.name?.[0],
          tDesc: f.description?.[0],
          tImage: f.imageUrl?.[0],
        });
        return;
      }
      tenantPayload = tParse.data;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          tenant: tenantPayload, // sólo si es dueño y lo llenó
        }),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        // Mostrar errores del servidor si los manda
        const det = (data?.details?.fieldErrors ?? {}) as Record<string, string[] | undefined>;
        setErrors({
          name: det.name?.[0],
          email: det.email?.[0],
          password: det.password?.[0],
          tName: det["tenant.name"]?.[0] ?? det.name?.[0],
          tDesc: det["tenant.description"]?.[0] ?? det.description?.[0],
          tImage: det["tenant.imageUrl"]?.[0] ?? det.imageUrl?.[0],
        });
        alert(data?.error || "No se pudo crear la cuenta");
        return;
      }

      // Autologin
      const signed = await signIn("credentials", { email, password, redirect: false });
      const ok = !signed?.error;

      const dest = destinationByRole(role, data?.tenantId);
      if (ok) {
        router.replace(dest);
        router.refresh();
      } else {
        // fallback: ir a signin con callback
        router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(dest)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
      <section className="mx-auto w-full max-w-lg px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-6 sm:p-8">
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Crear cuenta</h1>
          <p className="mt-2 text-sm text-zinc-600">Comienza el registro. Si eres dueño, puedes crear el restaurante aquí mismo.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label className="block text-sm">Nombre *</label>
              <input
                className={`mt-1 w-full rounded-xl border px-3 py-2 ${errors.name ? "border-red-500" : "border-zinc-300"}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm">Correo electrónico *</label>
              <input
                type="email"
                className={`mt-1 w-full rounded-xl border px-3 py-2 ${errors.email ? "border-red-500" : "border-zinc-300"}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm">Contraseña *</label>
              <input
                type="password"
                className={`mt-1 w-full rounded-xl border px-3 py-2 ${errors.password ? "border-red-500" : "border-zinc-300"}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                aria-invalid={Boolean(errors.password)}
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">Tipo de usuario</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  { val: "CUSTOMER", label: "Cliente" },
                  { val: "COURIER", label: "Repartidor" },
                  { val: "MERCHANT_OWNER", label: "Restaurante — Dueño" },
                  { val: "MERCHANT_STAFF", label: "Restaurante — Empleado" },
                ] as const).map((opt) => (
                  <label
                    key={opt.val}
                    className={`rounded-2xl border px-3 py-2 text-sm cursor-pointer transition ${
                      role === opt.val ? "border-amber-500 bg-amber-50" : "border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.val}
                      className="mr-2"
                      checked={role === opt.val}
                      onChange={() => setRole(opt.val)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Bloque restaurante si es dueño */}
            {role === "MERCHANT_OWNER" && (
              <fieldset className="mt-2 rounded-2xl border border-amber-200 p-4">
                <legend className="px-2 text-sm font-semibold text-amber-700">Datos del restaurante (opcional)</legend>

                <div className="mt-2">
                  <label className="block text-sm">Nombre del restaurante</label>
                  <input
                    className={`mt-1 w-full rounded-xl border px-3 py-2 ${errors.tName ? "border-red-500" : "border-zinc-300"}`}
                    value={tName}
                    onChange={(e) => setTName(e.target.value)}
                    placeholder="Taquería El Sol"
                    aria-invalid={Boolean(errors.tName)}
                  />
                  {errors.tName && <p className="mt-1 text-xs text-red-600">{errors.tName}</p>}
                  <p className="mt-1 text-xs text-zinc-500">Si lo llenas ahora, se creará automáticamente.</p>
                </div>

                <div className="mt-3">
                  <label className="block text-sm">Descripción (opcional)</label>
                  <textarea
                    className={`mt-1 w-full rounded-xl border px-3 py-2 ${errors.tDesc ? "border-red-500" : "border-zinc-300"}`}
                    rows={3}
                    value={tDesc}
                    onChange={(e) => setTDesc(e.target.value)}
                  />
                  {errors.tDesc && <p className="mt-1 text-xs text-red-600">{errors.tDesc}</p>}
                </div>

                <div className="mt-3">
                  <label className="block text-sm">Imagen (URL opcional)</label>
                  <input
                    className={`mt-1 w-full rounded-xl border px-3 py-2 ${errors.tImage ? "border-red-500" : "border-zinc-300"}`}
                    placeholder="https://..."
                    value={tImage}
                    onChange={(e) => setTImage(e.target.value)}
                  />
                  {errors.tImage && <p className="mt-1 text-xs text-red-600">{errors.tImage}</p>}
                </div>
              </fieldset>
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
                {loading ? "Creando..." : "Crear cuenta"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

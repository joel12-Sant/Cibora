"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react"; // 👈 importa signIn

type RoleKey = "CUSTOMER" | "COURIER" | "MERCHANT_OWNER" | "MERCHANT_STAFF";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleKey>("CUSTOMER");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function nextStepFor(role: RoleKey) {
    return role === "CUSTOMER"
      ? "/auth/signup/customer"
      : role === "COURIER"
      ? "/auth/signup/courier"
      : role === "MERCHANT_OWNER"
      ? "/auth/signup/merchant-owner"
      : "/auth/signup/merchant-staff";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // 1) registra
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || "No se pudo crear la cuenta");
        return;
      }

      // 2) autologin (Credentials)
      const signed = await signIn("credentials", {
        email,
        password,
        redirect: false, // no redirige automáticamente
      });

      const step = nextStepFor(role);

      // 3) redirige al paso 2 (si no pudo iniciar sesión, cae al login con callback)
      if (!signed?.error) {
        router.replace(step); // replace para que no vuelvan al signup al hacer back
      } else {
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(step)}`);
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
          <p className="mt-2 text-sm text-zinc-600">Comienza el registro y después completamos tu perfil.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm">Nombre</label>
              <input className="mt-1 w-full rounded-xl border px-3 py-2"
                     value={name} onChange={(e)=>setName(e.target.value)} required />
            </div>

            <div>
              <label className="block text-sm">Correo electrónico</label>
              <input type="email" className="mt-1 w-full rounded-xl border px-3 py-2"
                     value={email} onChange={(e)=>setEmail(e.target.value)} required />
            </div>

            <div>
              <label className="block text-sm">Contraseña</label>
              <input type="password" className="mt-1 w-full rounded-xl border px-3 py-2"
                     value={password} onChange={(e)=>setPassword(e.target.value)} required minLength={6} />
            </div>

            <div>
              <label className="block text-sm mb-1">Tipo de usuario</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  { val: "CUSTOMER", label: "Cliente" },
                  { val: "COURIER", label: "Repartidor" },
                  { val: "MERCHANT_OWNER", label: "Restaurante — Dueño" },
                  { val: "MERCHANT_STAFF", label: "Restaurante — Empleado" },
                ] as const).map(opt => (
                  <label key={opt.val}
                         className={`rounded-2xl border px-3 py-2 text-sm cursor-pointer transition
                         ${role===opt.val ? "border-amber-500 bg-amber-50" : "border-zinc-200 hover:bg-zinc-50"}`}>
                    <input type="radio" name="role" value={opt.val}
                           className="mr-2"
                           checked={role===opt.val}
                           onChange={()=>setRole(opt.val)} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={loading}
                      className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold
                                 bg-amber-500 text-white hover:text-orange-700 hover:bg-orange-50
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                                 disabled:opacity-60">
                {loading ? "Creando..." : "Continuar"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

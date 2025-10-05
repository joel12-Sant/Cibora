"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        // listo, envía al sign-in para que entre
        router.push("/auth/signin");
      } else {
        const j = await res.json().catch(() => null);
        setMsg(j?.error ?? "No se pudo crear la cuenta");
      }
    } catch (e) {
      setMsg("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border p-6"
      >
        <h1 className="text-2xl font-semibold">Crear cuenta</h1>

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            className="w-full rounded border px-3 py-2 bg-transparent"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            className="w-full rounded border px-3 py-2 bg-transparent"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <button
          disabled={loading}
          className="w-full rounded-lg border px-4 py-2 hover:bg-white/5 disabled:opacity-50"
        >
          {loading ? "Creando..." : "Crear cuenta"}
        </button>

        {msg && <p className="text-sm text-red-500">{msg}</p>}
      </form>
    </main>
  );
}

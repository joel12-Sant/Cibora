"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("test@cibora.app");
  const [password, setPassword] = useState("secret123");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
    if (res?.error) setMsg(res.error);
    else if (res?.ok) window.location.assign("/dashboard");
    setLoading(false);
  };

  return (
    <main className="max-w-sm p-6">
      <h1 className="text-2xl font-semibold mb-4">Iniciar sesión</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm">Email</label>
          <input className="w-full rounded border px-3 py-2 bg-transparent" type="email"
                 value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm">Password</label>
          <input className="w-full rounded border px-3 py-2 bg-transparent" type="password"
                 value={password} onChange={e=>setPassword(e.target.value)} required />
        </div>
        <button disabled={loading} className="rounded-lg border px-4 py-2 hover:bg-white/5 disabled:opacity-50">
          {loading ? "Entrando..." : "Entrar"}
        </button>
        {msg && <p className="text-sm text-red-400 mt-2">{msg}</p>}
      </form>
    </main>
  );
}

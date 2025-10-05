"use client";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useMemo } from "react";

export default function SigninClient() {
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") ?? "/";
  const error = sp.get("error");

  const msg = useMemo(() => {
    if (!error) return null;
    return error === "CredentialsSignin" ? "Credenciales inválidas." : "No se pudo iniciar sesión.";
  }, [error]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    await signIn("credentials", { redirect: true, callbackUrl, email, password });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {msg && <p className="text-sm text-red-500">{msg}</p>}
      <input name="email" type="email" placeholder="Email" className="w-full rounded border px-3 py-2" required />
      <input name="password" type="password" placeholder="Password" className="w-full rounded border px-3 py-2" required />
      <button type="submit" className="w-full rounded border px-3 py-2">Entrar</button>
    </form>
  );
}

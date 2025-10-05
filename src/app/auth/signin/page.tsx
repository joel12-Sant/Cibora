import { signIn } from "next-auth/react"; // sólo si lo llamas desde cliente; ver nota abajo
import Link from "next/link";

// ✅ Next 15: searchParams es Promise
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl = "/", error } = await searchParams;

  // Si tu formulario envía credenciales, conviene mover el envío a un Client Component
  // Aquí sólo renderizamos la UI y mostramos el error/callbackUrl.

  const errorMsg =
    error === "CredentialsSignin"
      ? "Credenciales inválidas."
      : error
      ? "No se pudo iniciar sesión."
      : null;

  return (
    <main className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
      {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

      {/* Si usas provider "credentials", renderiza un Client Component para manejar onSubmit */}
      <SigninForm callbackUrl={callbackUrl} />

      <p className="text-sm opacity-80">
        ¿No tienes cuenta? <Link className="underline" href="/">Volver al inicio</Link>
      </p>
    </main>
  );
}

// 👇 Client Component para manejar el submit con next-auth/react (signIn)
"use client";
import { signIn as clientSignIn } from "next-auth/react";
function SigninForm({ callbackUrl }: { callbackUrl: string }) {
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    await clientSignIn("credentials", { redirect: true, callbackUrl, email, password });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input name="email" type="email" placeholder="Email" className="w-full rounded border px-3 py-2" required />
      <input name="password" type="password" placeholder="Password" className="w-full rounded border px-3 py-2" required />
      <button type="submit" className="w-full rounded border px-3 py-2">Entrar</button>
    </form>
  );
}

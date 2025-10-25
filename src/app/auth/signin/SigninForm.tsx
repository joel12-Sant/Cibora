"use client";

import { signIn } from "next-auth/react";

export default function SigninForm({ callbackUrl }: { callbackUrl: string }) {
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    await signIn("credentials", {
      redirect: true,
      callbackUrl,
      email,
      password,
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-4">
      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm">
          Correo electrónico *
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="tucorreo@ejemplo.com"
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 shadow-sm
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          required
          autoComplete="email"
          inputMode="email"
        />
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm">
          Contraseña *
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 shadow-sm
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          required
          autoComplete="current-password"
          minLength={6}
        />
        <div className="mt-2 text-xs">
          <a
            href="/auth/forgot"
            className="text-zinc-700 underline underline-offset-2 hover:text-orange-700"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </div>

      {/* CTA */}
      <div className="pt-1">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold
                     bg-amber-500 text-white transition
                     hover:text-orange-700 hover:bg-orange-50
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                     disabled:opacity-60"
        >
          Entrar
        </button>
      </div>
    </form>
  );
}

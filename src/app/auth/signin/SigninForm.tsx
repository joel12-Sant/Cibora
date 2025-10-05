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
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        name="email"
        type="email"
        placeholder="Email"
        className="w-full rounded border px-3 py-2"
        required
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        className="w-full rounded border px-3 py-2"
        required
      />
      <button type="submit" className="w-full rounded border px-3 py-2">
        Entrar
      </button>
    </form>
  );
}

// src/app/auth/signin/page.tsx
"use client";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl mb-4">Iniciar sesión</h1>
      <button
        onClick={() => signIn("credentials", { callbackUrl: "/" })}
        className="rounded-lg border px-4 py-2"
      >
        Entrar (Credentials)
      </button>
    </main>
  );
}

"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data, status } = useSession();
  if (status === "loading") return null;

  if (!data?.user) {
    return (
      <button
        onClick={() => signIn(undefined, { callbackUrl: "/dashboard" })}
        className="rounded-lg border px-3 py-1.5 hover:bg-white/5"
      >
        Iniciar sesión
      </button>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm opacity-80">{data.user.email}</span>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="rounded-lg border px-3 py-1.5 hover:bg-white/5"
      >
        Salir
      </button>
    </div>
  );
}

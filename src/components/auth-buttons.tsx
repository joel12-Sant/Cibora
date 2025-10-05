"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <button className="rounded border px-3 py-1.5 opacity-50">Cargando…</button>;
  }

  if (!session) {
    return (
      <button onClick={() => signIn()} className="rounded border px-3 py-1.5">
        Iniciar sesión
      </button>
    );
  }

  return (
    <button onClick={() => signOut()} className="rounded border px-3 py-1.5">
      Cerrar sesión
    </button>
  );
}

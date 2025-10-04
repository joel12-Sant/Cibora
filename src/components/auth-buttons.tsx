// src/components/auth-buttons.tsx
"use client";
import { signIn, signOut } from "next-auth/react";

export function SignInButton() {
  return <button onClick={() => signIn()} className="underline">Iniciar sesión</button>;
}
export function SignOutButton() {
  return <button onClick={() => signOut()} className="underline">Cerrar sesión</button>;
}

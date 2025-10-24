import Link from "next/link";
import { auth } from "@/lib/auth";
import CartBadge from "@/components/cart/CartBadge";
import type { Role } from "@prisma/client";

function isMerchant(role: Role | undefined | null): boolean {
  return role === "MERCHANT_OWNER" || role === "MERCHANT_STAFF" || role === "ADMIN";
}

export default async function Header() {
  const session = await auth();
  const user = session?.user ?? null;

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 p-4">
        <Link href="/" className="font-semibold">Cibora</Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/">Inicio</Link>

          {user && <Link href="/orders/history">Mis pedidos</Link>}
          {isMerchant(user?.role) && <Link href="/dashboard">Dashboard</Link>}

          <CartBadge /> {/* ⬅️ aquí va el badge */}

          {user ? (
            <form action="/api/auth/signout" method="post">
              <button className="rounded border px-3 py-1" type="submit">Cerrar sesión</button>
            </form>
          ) : (
            <Link href="/auth/signin" className="underline">Iniciar sesión</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

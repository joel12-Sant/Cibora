import Link from "next/link";
import { auth } from "@/lib/auth";
import CartBadge from "@/components/cart/CartBadge";
import type { Role } from "@prisma/client";
import StyleButton from "@/components/style-button";

function isMerchant(role: Role | undefined | null): boolean {
  return role === "MERCHANT_OWNER" || role === "MERCHANT_STAFF" || role === "ADMIN";
}
function isCustomer(role: Role | undefined | null): boolean {
  return role === "CUSTOMER";
}

export default async function Header() {
  const session = await auth();
  const user = session?.user ?? null;

  return (
    <header className="sticky top-0 z-50 bg-amber-400 border-b border-amber-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            aria-label="Ir a inicio"
            className="
              text-lg font-extrabold tracking-tight
              bg-orange-600
              bg-clip-text text-transparent
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded
            "
          >
            Cibora
          </Link>

          {/* Acciones rápidas (desktop) */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {user ? (
              <StyleButton href="/api/auth/signout" text="Cerrar sesión" method="post" />
            ) : (
              <StyleButton href="/auth/signin" label="Iniciar sesión en su cuenta" text="Iniciar sesión" />
            )}
          </div>

          {/* Hamburguesa*/}
          <details className="md:hidden relative">
            <summary
              className="
                list-none inline-flex h-10 w-10 items-center justify-center rounded-xl
                border border-amber-300 bg-amber-500 text-white
                hover:text-orange-700 hover:bg-orange-50 transition
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                cursor-pointer select-none
              "
              aria-label="Abrir navegación"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </summary>

            {/*movil*/}
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-amber-300 bg-white p-3 shadow-md z-50">
              <nav aria-label="Principal móvil">
                <ul className="flex flex-col gap-2 text-sm">
                  <li><StyleButton href="/" label="Ir a inicio" text="Inicio" /></li>

                  {isCustomer(user?.role) && (
                    <li><StyleButton href="/orders/history/customer" label="Ver mis pedidos" text="Mis pedidos" /></li>
                  )}

                  {isMerchant(user?.role) && (
                    <li><StyleButton href="/orders/history/merchant" label="Ver pedidos del comerciante" text="Pedidos" /></li>
                  )}

                  {isMerchant(user?.role) && (
                    <li><StyleButton href="/dashboard" label="Ir al panel del comerciante" text="Dashboard" /></li>
                  )}

                  <li className="flex items-center justify-between pt-1">
                    <span className="text-zinc-600">Carrito</span>
                    <CartBadge />
                  </li>

                  <li className="">
                    {user ? (
                      <StyleButton href="/api/auth/signout" text="Cerrar sesión" method="post" />
                    ) : (
                      <StyleButton href="/auth/signin" label="Iniciar sesión en su cuenta" text="Iniciar sesión" />
                    )}
                  </li>
                </ul>
              </nav>
            </div>
          </details>
        </div>

        {/* Fila inferior (desktop) */}
        <div className="hidden md:block pb-5">
          <nav aria-label="Principal">
            <ul className="flex items-center gap-2">
              <li><StyleButton href="/" label="Ir a inicio" text="Inicio" size="sm" /></li>

              {isCustomer(user?.role) && (
                <li><StyleButton href="/orders/history/customer" label="Ver mis pedidos" text="Mis pedidos" size="sm" /></li>
              )}

              {isMerchant(user?.role) && (
                <li><StyleButton href="/orders/history/merchant" label="Ver pedidos del comerciante" text="Pedidos" size="sm" /></li>
              )}

              {isMerchant(user?.role) && (
                <li><StyleButton href="/dashboard" label="Ir al panel del comerciante" text="Dashboard" size="sm" /></li>
              )}

              {/* CartBadge a la derecha */}
              <li><CartBadge /></li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

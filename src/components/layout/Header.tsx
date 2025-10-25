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
          {/*Logo*/}
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
              StyleButton("/api/auth/signout","","Cerrar sesión","post")
            ) : (
              StyleButton("/auth/signin", "Iniciar sesión en su cuenta", "Iniciar sesión" )
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

            {/* Panel móvil */}
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-amber-300 bg-white p-3 shadow-md z-50">
              <nav aria-label="Principal móvil">
                <ul className="flex flex-col gap-2 text-sm">
                  <li>
                    {StyleButton("/", "Ir a inicio", "Inicio")}
                  </li>

                  {isCustomer(user?.role) && (
                    <li>
                      {StyleButton("/orders/history/customer", "Ver mis pedidos", "Mis pedidos")}
                    </li>
                  )}

                  {isMerchant(user?.role) && (
                    <li>
                      {StyleButton("/orders/history/merchant", "Ver los pedidos del comerciante", "Pedidos")}
                    </li>
                  )}

                  {isMerchant(user?.role) && (
                    <li>
                      {StyleButton("/dashboard", "Ir al panel de control del comerciante", "Dashboard")}
                    </li>
                  )}

                  <li className="flex items-center justify-between pt-1">
                    <span className="text-zinc-600">Carrito</span>
                    <CartBadge />
                  </li>

                  <li>
                    {user ? (
                      StyleButton("/api/auth/signout","","Cerrar sesión","post")
                    ) : (
                      StyleButton("/auth/signin","Iniciar sesión en su cuenta","Iniciar sesión")
                    )}
                  </li>
                </ul>
              </nav>
            </div>
          </details>
        </div>

        {/* Fila inferior*/}
        <div className="hidden md:block pb-5">
          <nav aria-label="Principal">
            <ul className="flex">
              <div className="flex items-center gap-2">
                <li>
                    {StyleButton("/", "Ir a inicio", "Inicio")}
                </li>

                {isCustomer(user?.role) && (
                  <li>
                    {StyleButton("/orders/history/customer", "Ver mis pedidos", "Mis pedidos","text-sm")}
                  </li>
                )}

                {isMerchant(user?.role) && (
                  <li>
                    {StyleButton("/orders/history/merchant", "Ver los pedidos del comerciante", "Pedidos","text-sm")}
                  </li>
                )}

                {isMerchant(user?.role) && (
                  <li>
                    {StyleButton("/dashboard", "Ir al panel de control del comerciante","dashboard","text-sm")}
                  </li>
                )}
                <li>
                  <CartBadge />
                </li>
              </div>

            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

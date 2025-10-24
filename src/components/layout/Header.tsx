import Link from "next/link";
import { auth } from "@/lib/auth";
import CartBadge from "@/components/cart/CartBadge";
import type { Role } from "@prisma/client";

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
        {/* Fila superior */}
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Marca (igual) */}
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
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="
                    inline-flex items-center rounded-full px-4 py-2 text-sm font-medium
                    bg-amber-500 text-white no-underline
                    hover:text-orange-700 hover:bg-orange-50 transition
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                  "
                >
                  Cerrar sesión
                </button>
              </form>
            ) : (
              <Link
                href="/auth/signin"
                className="
                  inline-flex items-center rounded-full px-4 py-2 text-sm font-medium
                  bg-amber-500 text-white no-underline
                  hover:text-orange-700 hover:bg-orange-50 transition
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                "
              >
                Iniciar sesión
              </Link>
            )}
          </div>

          {/* Hamburguesa (móvil) */}
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
                    <Link
                      href="/"
                      className="
                        block text-center rounded-full px-4 py-2 font-medium
                        !bg-amber-500 !text-white no-underline
                        hover:!text-orange-700 hover:!bg-orange-50 transition
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                      "
                    >
                      Inicio
                    </Link>
                  </li>

                  {isCustomer(user?.role) && (
                    <li>
                      <Link
                        href="/orders/history/customer"
                        className="
                          block text-center rounded-full px-4 py-2 font-medium
                          !bg-amber-500 !text-white no-underline
                          hover:!text-orange-700 hover:!bg-orange-50 transition
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                        "
                      >
                        Mis pedidos
                      </Link>
      
                    </li>
                  )}

                  {isMerchant(user?.role) && (
                    <li>
                      <Link
                        href="/orders/history/merchant"
                        className="
                          block text-center rounded-full px-4 py-2 font-medium
                          !bg-amber-500 !text-white no-underline
                          hover:!text-orange-700 hover:!bg-orange-50 transition
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                        "
                      >
                        Pedidos
                      </Link>
                    </li>
                  )}

                  {isMerchant(user?.role) && (
                    <li>
                      <Link
                        href="/dashboard"
                        className="
                          block text-center rounded-full px-4 py-2 font-medium
                          !bg-amber-500 !text-white no-underline
                          hover:!text-orange-700 hover:!bg-orange-50 transition
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                        "
                      >
                        Dashboard
                      </Link>
                    </li>
                  )}

                  <li className="flex items-center justify-between pt-1">
                    <span className="text-zinc-600">Carrito</span>
                    <CartBadge />
                  </li>

                  <li>
                    {user ? (
                      <form action="/api/auth/signout" method="post">
                        <button
                          type="submit"
                          className="
                            w-full rounded-full px-4 py-2 text-sm font-medium
                            !bg-amber-500 !text-white no-underline
                            hover:!text-orange-700 hover:!bg-orange-50 transition
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                          "
                        >
                          Cerrar sesión
                        </button>
                      </form>
                    ) : (
                      <Link
                        href="/auth/signin"
                        className="
                          block text-center rounded-full px-4 py-2 text-sm font-medium
                          !bg-amber-500 !text-white no-underline
                          hover:!text-orange-700 hover:!bg-orange-50 transition
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                        "
                      >
                        Iniciar sesión
                      </Link>
                    )}
                  </li>
                </ul>
              </nav>
            </div>
          </details>
        </div>

        {/* Fila inferior (desktop): links en segunda fila + CartBadge */}
        <div className="hidden md:block pb-5">
          <nav aria-label="Principal">
            <ul className="flex">
              <div className="flex items-center gap-2">
                <li>
                  <Link
                    href="/"
                    className="
                  inline-flex items-center rounded-full px-4 py-2 text-sm font-medium
                  bg-amber-500 text-white no-underline
                  hover:text-orange-700 hover:bg-orange-50 transition
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                    "
                  >
                    Inicio
                  </Link>
                </li>

                {isCustomer(user?.role) && (
                  <li>
                    <Link
                      href="/orders/history/customer"
                      className="
                  inline-flex items-center rounded-full px-4 py-2 text-sm font-medium
                  bg-amber-500 text-white no-underline
                  hover:text-orange-700 hover:bg-orange-50 transition
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                      "
                    >
                      Mis pedidos
                    </Link>
                  </li>
                )}

                {isMerchant(user?.role) && (
                  <li>
                    <Link
                      href="/orders/history/merchant"
                      className="
                        inline-flex items-center rounded-full px-4 py-2 text-sm font-medium
                        text-zinc-800 no-underline
                        hover:bg-orange-50 hover:text-orange-700 transition
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                      "
                    >
                      Pedidos
                    </Link>
                  </li>
                )}

                {isMerchant(user?.role) && (
                  <li>
                    <Link
                      href="/dashboard"
                      className="
                        inline-flex items-center rounded-full px-4 py-2 text-sm font-medium
                        text-zinc-800 no-underline
                        hover:bg-orange-50 hover:text-orange-700 transition
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                      "
                    >
                      Dashboard
                    </Link>
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

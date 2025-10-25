import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="
        border-t border-amber-200
        bg-amber-50/80 backdrop-blur supports-[backdrop-filter]:bg-amber-50/60
        text-zinc-800
      "
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Top: brand + secciones */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link
              href="/"
              aria-label="Ir a inicio"
              className="
                text-lg font-extrabold tracking-tight
                bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-500
                bg-clip-text text-transparent
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded
              "
            >
              Cibora
            </Link>
            <p className="mt-2 text-sm text-zinc-600">
              Delivery cálido y sencillo. Ordena de tus lugares favoritos.
            </p>
          </div>

          {/* Explorar */}
          <nav aria-label="Explorar" className="md:col-span-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Explorar</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/restaurants"
                  className="inline-flex items-center rounded-lg px-2 py-1 text-sm hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  Restaurantes
                </Link>
              </li>
              <li>
                <Link
                  href="/orders/history"
                  className="inline-flex items-center rounded-lg px-2 py-1 text-sm hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  Mis pedidos
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-lg px-2 py-1 text-sm hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </nav>

          {/* Empresa */}
          <nav aria-label="Empresa" className="md:col-span-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Empresa</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="#"
                  className="inline-flex items-center rounded-lg px-2 py-1 text-sm hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  Sobre nosotros
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="inline-flex items-center rounded-lg px-2 py-1 text-sm hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  Ayuda
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="inline-flex items-center rounded-lg px-2 py-1 text-sm hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  Contacto
                </Link>
              </li>
            </ul>
          </nav>

          {/* Legal */}
          <nav aria-label="Legal" className="md:col-span-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Legal</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="#"
                  className="inline-flex items-center rounded-lg px-2 py-1 text-sm hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  Términos
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="inline-flex items-center rounded-lg px-2 py-1 text-sm hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  Privacidad
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="inline-flex items-center rounded-lg px-2 py-1 text-sm hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  Cookies
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-amber-200 pt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-zinc-500">
            © {year} Cibora. Todos los derechos reservados.
          </p>

          <div className="flex items-center gap-2">
            {/* Social minimal (placeholders) */}
            <Link
              href="#"
              aria-label="Instagram"
              className="inline-flex items-center rounded-full p-2 hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              title="Instagram"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6.5-.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z"
                  fill="currentColor"
                />
              </svg>
            </Link>
            <Link
              href="#"
              aria-label="Twitter/X"
              className="inline-flex items-center rounded-full p-2 hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              title="Twitter/X"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M4 3h5l4 6 5-6h2l-6 7 7 11h-5l-5-7-6 7H3l7-8L4 3Z"
                  fill="currentColor"
                />
              </svg>
            </Link>
            <Link
              href="#"
              aria-label="GitHub"
              className="inline-flex items-center rounded-full p-2 hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              title="GitHub"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.71-2.78.6-3.37-1.2-3.37-1.2-.46-1.16-1.12-1.47-1.12-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.05 1.53 1.05 .9 1.54 2.36 1.1 2.94.84.09-.65.35-1.1.63-1.35-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.8c.85 0 1.71.12 2.51.35 1.9-1.29 2.74-1.02 2.74-1.02 .55 1.37.2 2.39.1 2.64.64.7 1.02 1.59 1.02 2.68 0 3.85-2.35 4.7-4.58 4.95.36.31.67.92.67 1.86 0 1.35-.01 2.43-.01 2.76 0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
                  fill="currentColor"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

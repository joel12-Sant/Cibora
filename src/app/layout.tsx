import Link from "next/link";

export const metadata = {
  title: "Cibora",
  description: "Cibora — Marketplace de comida",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Cibora</h1>
            <nav className="text-sm opacity-80">
              <Link href="/" className="hover:underline mr-4">
                Inicio
              </Link>
              <Link href="/restaurants" className="hover:underline">
                Restaurantes
              </Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

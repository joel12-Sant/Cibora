import Link from "next/link";
import Providers from "./providers";
import AuthButton from "@/components/auth-buttons";

export const metadata = {
  title: "Cibora",
  description: "Cibora — Marketplace de comida",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <Providers>
          <div className="mx-auto max-w-6xl px-4 py-6">
            <header className="mb-6 flex items-center justify-between">
              <Link href="/" className="text-2xl font-bold">Cibora</Link>
              <nav className="text-sm opacity-80">
                <Link href="/" className="hover:underline mr-4">Inicio</Link>
                <Link href="/restaurants" className="hover:underline">Restaurantes</Link>
              </nav>
              <AuthButton />
            </header>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}

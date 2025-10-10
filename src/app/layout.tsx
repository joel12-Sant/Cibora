import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import SessionProvider from "@/components/auth/SessionProvider";
import CartHydrator from "@/app/cart/CartHydrator";
export const metadata: Metadata = {
  title: "Cibora",
  description: "Marketplace multi-tenant de delivery",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <SessionProvider>
          <CartHydrator />
          <Header />
          <main>{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}

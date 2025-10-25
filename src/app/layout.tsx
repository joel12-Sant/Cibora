import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import SessionProvider from "@/components/auth/SessionProvider";
import CartHydrator from "@/app/cart/CartHydrator";
import { Manrope } from "next/font/google";

export const metadata: Metadata = {
  title: "Cibora",
  description: "Marketplace multi-tenant de delivery",
};

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  weight: ["200","300","400","500","600","700","800"],
  variable: "--font-manrope",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={manrope.variable}>
      <body className="min-h-screen font-sans bg-white text-zinc-900 antialiased">
        <SessionProvider>
          <CartHydrator />
          <Header />
          <main>{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}

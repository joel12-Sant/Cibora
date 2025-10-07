// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";
import type { Role } from "@prisma/client";

// Nota: este middleware corre en Edge (está bien). No usar Prisma aquí.
// Asegúrate de tener NEXTAUTH_SECRET configurado en Vercel.

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const { pathname } = (req as NextRequest).nextUrl;
      // Si no hay token (no logueado)
      if (!token) {
        // /orders/history y /dashboard requieren login
        if (pathname.startsWith("/orders/history")) return false;
        if (pathname.startsWith("/dashboard")) return false;
        // el resto público
        return true;
      }

      // Tipamos el role del token (lo extendimos en types/next-auth.d.ts)
      const role = token.role as Role | undefined;

      // /dashboard: solo merchant staff/owner o admin
      if (pathname.startsWith("/dashboard")) {
        return role === "MERCHANT_OWNER" || role === "MERCHANT_STAFF" || role === "ADMIN";
      }

      // /orders/history: cualquier usuario autenticado
      if (pathname === "/orders/history") {
        return true;
      }

      // Para todo lo demás, permitir
      return true;
    },
  },
});

// Define qué rutas protege el middleware
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/orders/history",
  ],
};

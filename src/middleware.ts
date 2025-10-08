// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import type { JWT } from "next-auth/jwt";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const pathname = (req as NextRequest).nextUrl.pathname;

      // No autenticado: bloquea rutas protegidas
      if (!token) {
        if (pathname.startsWith("/orders/history")) return false;
        if (pathname.startsWith("/dashboard")) return false;
        return true; // resto público
      }

      // Extrae role del token con tipado (sin any)
      const role = (token as JWT & { role?: Role }).role;

      // /dashboard solo merchant o admin
      if (pathname.startsWith("/dashboard")) {
        return (
          role === "MERCHANT_OWNER" ||
          role === "MERCHANT_STAFF" ||
          role === "ADMIN"
        );
      }

      // /orders/history: cualquier autenticado
      if (pathname === "/orders/history") return true;

      return true;
    },
  },
});

// Importante: no interceptar /api/*
export const config = {
  matcher: ["/dashboard/:path*", "/orders/history"],
};

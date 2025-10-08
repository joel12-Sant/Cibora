// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";
import type { Role } from "@prisma/client";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const pathname = (req as NextRequest).nextUrl.pathname;

      // No autenticado: bloquea las rutas protegidas
      if (!token) {
        if (pathname.startsWith("/orders/history")) return false;
        if (pathname.startsWith("/dashboard")) return false;
        return true; // resto público
      }

      // Con token: aplica roles para /dashboard
      const role = (token as any).role as Role | undefined;

      if (pathname.startsWith("/dashboard")) {
        return role === "MERCHANT_OWNER" || role === "MERCHANT_STAFF" || role === "ADMIN";
      }

      if (pathname === "/orders/history") {
        return true; // cualquier usuario autenticado
      }

      return true;
    },
  },
});

// Importante: no interceptar /api/*
export const config = {
  matcher: ["/dashboard/:path*", "/orders/history"],
};

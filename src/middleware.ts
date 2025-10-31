// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import type { JWT } from "next-auth/jwt";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const pathname = (req as NextRequest).nextUrl.pathname;

      if (!token) {
        if (pathname.startsWith("/orders/history")) return false;
        if (pathname.startsWith("/dashboard")) return false;
        return true;
      }

      const role = (token as JWT & { role?: Role }).role;

      if (pathname.startsWith("/dashboard")) {
        return (
          role === "MERCHANT_OWNER" ||
          role === "MERCHANT_STAFF" ||
          role === "ADMIN"
        );
      }

      if (pathname === "/orders/history") return true;

      return true;
    },
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/orders/history"],
};

import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token, // hay JWT => pasa
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/orders/history/:path*","/cart:path*"], // 👈 NO incluyas "/"
};

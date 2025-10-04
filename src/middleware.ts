// NextAuth v4
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/orders/history/:path*"],
};

// NextAuth v4
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/:path*", "/orders/history/:path*"],
};

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

// Fuerza Node.js para NextAuth en App Router
export const runtime = "nodejs";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

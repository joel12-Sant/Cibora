import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

// Exporta únicamente GET y POST del handler:
export const { GET, POST } = NextAuth(authOptions);

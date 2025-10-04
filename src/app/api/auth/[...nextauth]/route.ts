import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const runtime = "nodejs"; // 👈 importante en App Router

export const { GET, POST } = NextAuth(authOptions);

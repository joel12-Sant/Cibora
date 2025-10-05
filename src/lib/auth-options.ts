import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import type { JWT } from "next-auth/jwt";

// … providers / adapter (tu código) …

type DbUser = Pick<User, "id" | "role" | "tenantId">;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(c) {
        if (!c?.email || !c?.password) return null;
        const u = await prisma.user.findUnique({ where: { email: c.email } });
        if (!u?.passwordHash) return null;
        const ok = await bcrypt.compare(c.password, u.passwordHash);
        return ok ? u : null;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }): Promise<JWT> {
      if (user) {
        const u = user as DbUser;
        token.id = u.id;
        token.role = u.role;
        token.tenantId = u.tenantId ?? null;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        if (token.id) session.user.id = token.id;
        if (token.role) session.user.role = token.role;
        session.user.tenantId = token.tenantId ?? null;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

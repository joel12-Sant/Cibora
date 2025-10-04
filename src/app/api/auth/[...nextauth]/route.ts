import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

type DbUser = {
  id: string;
  role: Role;
  tenantId: string | null;
};

const adapter: Adapter = PrismaAdapter(prisma);

export const authOptions: NextAuthOptions = {
  adapter,
  session: { strategy: "database" },
  pages: { signIn: "/auth/signin" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        return ok ? user : null;
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // castea el user de Prisma al shape que necesitas
      const u = user as unknown as DbUser;
      if (session.user) {
        session.user.id = u.id;
        session.user.role = u.role;
        session.user.tenantId = u.tenantId;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

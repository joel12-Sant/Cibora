import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // lo que pongas aquí queda en 'user' del callback jwt
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId ?? null,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // En login
      if (user) {
        const u = user as any;
        (token as any).role = u.role ?? (token as any).role;
        (token as any).tenantId = u.tenantId ?? (token as any).tenantId ?? null;
      }

      // En requests subsecuentes, mantener en sync con DB
      if (!user && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, tenantId: true },
        });
        if (dbUser) {
          (token as any).role = dbUser.role;
          (token as any).tenantId = dbUser.tenantId ?? null;
        }
      }

      // Permitir useSession().update(...)
      if (trigger === "update" && session?.user) {
        (token as any).role = (session.user as any).role ?? (token as any).role;
        (token as any).tenantId = (session.user as any).tenantId ?? (token as any).tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub as string;
        (session.user as any).role = (token as any).role;
        (session.user as any).tenantId = (token as any).tenantId ?? null;
      }
      return session;
    },
  },
};

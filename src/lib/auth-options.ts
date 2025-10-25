// src/lib/auth-options.ts
import type { NextAuthOptions, Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

/** Estructura de usuario que devolvemos en `authorize` */
type AppUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string | null;
};

/** JWT extendido con nuestros campos */
type AppJWT = JWT & {
  role?: Role;
  tenantId?: string | null;
};

/** Session con usuario extendido (sin module augmentation) */
type AppSession = Session & {
  user: NonNullable<Session["user"]> & {
    id: string;
    role: Role;
    tenantId: string | null;
  };
};

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<AppUser | null> {
        const email = credentials?.email ?? "";
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const t = token as AppJWT;

      // Primer login: copiar datos del usuario autorizado
      if (user) {
        const u = user as AppUser;
        t.role = u.role;
        t.tenantId = u.tenantId ?? null;
      }

      // Peticiones subsecuentes: mantener sync con la BD
      if (!user && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, tenantId: true },
        });
        if (dbUser) {
          t.role = dbUser.role;
          t.tenantId = dbUser.tenantId ?? null;
        }
      }

      // Permitir useSession().update({ user: { role, tenantId } })
      if (trigger === "update" && session?.user) {
        const sUser = session.user as Partial<AppSession["user"]>;
        if (sUser.role) t.role = sUser.role;
        if (typeof sUser.tenantId !== "undefined") t.tenantId = sUser.tenantId;
      }

      return t;
    },

    async session({ session, token }) {
      const t = token as AppJWT;

      // Prevenir user indefinido
      const baseUser = session.user ?? {};
      const s = session as AppSession;

      s.user = {
        id: token.sub ?? "",
        name: baseUser.name ?? null,
        email: baseUser.email ?? null,
        image: baseUser.image ?? null,
        role: t.role ?? "CUSTOMER",
        tenantId: t.tenantId ?? null,
      };

      return s;
    },
  },
};

import NextAuth, { DefaultSession } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    tenantId: string | null;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      tenantId: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    tenantId: string | null;
  }
}

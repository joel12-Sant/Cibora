import { DefaultSession } from "next-auth";
import type { User } from "@prisma/client";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: User["role"];
      tenantId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: User["role"];
    tenantId?: string | null;
  }
}

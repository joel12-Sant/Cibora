import { DefaultSession } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      tenantId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
    tenantId?: string | null;
  }
}

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      branchId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    branchId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    branchId?: string | null;
  }
}

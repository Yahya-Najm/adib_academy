import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role: string }).role;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.role = token.role as string;
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const session = auth;
      if (!session) return false;

      const role = (session.user as { role?: string }).role;
      const { pathname } = nextUrl;

      if (pathname.startsWith("/general-manager") && role !== "GENERAL_MANAGER") return false;
      if (pathname.startsWith("/manager") && role !== "MANAGER") return false;
      if (pathname.startsWith("/teacher") && role !== "TEACHER") return false;

      return true;
    },
  },
} satisfies NextAuthConfig;

import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isOnApiAuth = nextUrl.pathname.startsWith("/api/auth");

      if (isOnApiAuth) {
        return true;
      }

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      // Role protected paths
      if (isLoggedIn) {
        const role = (auth?.user as any)?.role;
        const isCeoOrEa = role === "ceo" || role === "ea";

        if (nextUrl.pathname.startsWith("/ea-view") && !isCeoOrEa) {
          return Response.redirect(new URL("/", nextUrl));
        }
        if (nextUrl.pathname.startsWith("/ceo-view") && !isCeoOrEa) {
          return Response.redirect(new URL("/", nextUrl));
        }
        if (nextUrl.pathname.startsWith("/admin") && role !== "admin") {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      return false; // Redirect unauthenticated users to /login
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.hasGlobalAccess = (user as any).hasGlobalAccess;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).hasGlobalAccess = token.hasGlobalAccess;
      }
      return session;
    },
  },
  providers: [], // Configured in auth.ts with Credentials
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.AUTH_SECRET || "duston_super_secret_auth_key_2026_ghana_conglomerate_secure_token",
} satisfies NextAuthConfig;

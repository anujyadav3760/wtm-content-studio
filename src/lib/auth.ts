/**
 * NextAuth config — Google OAuth + email allowlist.
 *
 * Allowlist comes from NEXT_AUTH_ALLOWLIST (comma-separated emails).
 * Anyone not in the allowlist gets bounced at `signIn()` time → 403.
 *
 * Phase γ uses single-user mode (just anuj4frens@gmail.com). Phase δ
 * adds Supabase role table for multi-user multi-brand.
 */

import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

function allowlist(): Set<string> {
  return new Set(
    (process.env.NEXT_AUTH_ALLOWLIST ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = (user.email ?? "").toLowerCase();
      const allow = allowlist();
      if (allow.size === 0) {
        console.warn(
          "[auth] NEXT_AUTH_ALLOWLIST empty — denying everyone. Set the env var.",
        );
        return false;
      }
      return allow.has(email);
    },
    async session({ session, token }) {
      // Surface the email on the client session for the UI
      if (session.user && token.email) {
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

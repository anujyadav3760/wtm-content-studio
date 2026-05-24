/**
 * Route gate — every page except /login + /api/auth/* requires a valid session.
 *
 * Uses NextAuth's withAuth middleware. NEXT_AUTH_ALLOWLIST is enforced
 * inside the signIn callback (src/lib/auth.ts), so by the time a token
 * exists here we know the user is in the allowlist.
 */

export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *   - /login (public sign-in)
     *   - /api/auth/* (NextAuth's own routes)
     *   - /_next/* (Next.js internals)
     *   - /favicon.ico, public assets
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};

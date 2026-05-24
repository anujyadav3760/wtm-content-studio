/**
 * /login — Google OAuth sign-in screen.
 *
 * Only emails in NEXT_AUTH_ALLOWLIST can sign in. Anyone else lands
 * back here with ?error=AccessDenied (NextAuth's default behaviour
 * when signIn callback returns false).
 */

"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginInner() {
  const params = useSearchParams();
  const error = params.get("error");
  const showAccessDenied = error === "AccessDenied";

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
      <div className="max-w-md w-full px-8">
        <h1 className="text-2xl font-bold mb-2">WTM Content Studio</h1>
        <p className="text-slate-400 text-sm mb-8">
          Creator console for WhatsTheMoat + sibling brands. Sign in with Google.
        </p>

        {showAccessDenied && (
          <div className="bg-red-900/40 border border-red-500/30 text-red-200 text-sm px-4 py-3 rounded mb-6">
            Access denied. Your email isn&apos;t in the allowlist. Contact admin.
          </div>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full bg-white hover:bg-slate-100 text-slate-900 font-medium px-4 py-3 rounded transition"
        >
          Sign in with Google
        </button>

        <p className="text-slate-500 text-xs mt-8">
          Phase γ · single-user mode · multi-user coming in Phase δ
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <LoginInner />
    </Suspense>
  );
}

# WTM Content Studio

Creator console for [wtm-social-automation](https://github.com/anujyadav3760/wtm-social-automation). Phase γ of the platform build — Next.js 14 + Supabase + NextAuth (Google OAuth).

**Status (2026-05-25):** W3 ✅ scaffold + auth + read-only kanban. W4-W8 in progress (see [parent repo's `docs/phase-gamma-creator-console.md`](https://github.com/anujyadav3760/wtm-social-automation/blob/main/docs/phase-gamma-creator-console.md)).

## What this does (when complete)

- **W3 (this PR):** read-only kanban of every ContentIdea from the WTM cron + manual submissions, grouped by state machine status
- **W5:** "Submit idea" form (3 modes: subject only, subject+constraints, full draft)
- **W6:** Pillar configuration (cadence, day weights, enable/disable)
- **W7:** Per-post Metricool analytics readback (likes/comments/reach/clicks)

## Architecture

```
wtm-content-studio (this repo)          wtm-social-automation (sibling)
  Next.js 14 App Router                   Python cron + Railway
  Server components fetch from   ←─────   ContentIdea writes via SupabaseIdeaStore
        ↓
  Supabase (public.wtm_social_*)   ←─────  Both repos write the same tables
        ↓
  Kanban renders live state
```

Auth: NextAuth + Google OAuth + email allowlist (`NEXT_AUTH_ALLOWLIST` env var).
Data: Supabase service role key (server-side only) → `public.wtm_social_content_ideas`.

## Local development

```bash
# Install deps
pnpm install

# Copy env template + fill in values (Google OAuth + Supabase)
cp .env.local.example .env.local
# edit .env.local

# Run dev server
pnpm dev
# → http://localhost:3000 — redirects to /login if not signed in
```

### Env vars needed

See `.env.local.example`. The most critical:

| Var | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL — same as parent repo |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Settings → API → service_role (server-only!) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create OAuth 2.0 Client → Web application |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` (dev) / your-vercel-domain (prod) |
| `NEXT_AUTH_ALLOWLIST` | `anuj4frens@gmail.com` |

### Google OAuth setup (one-time)

1. https://console.cloud.google.com/apis/credentials → Create credentials → OAuth client ID → Web application
2. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://<your-vercel-domain>/api/auth/callback/google` (prod)
3. Copy Client ID + Client Secret into `.env.local`

## Deploy to Vercel

1. `vercel link` (or push to GitHub + import in Vercel dashboard)
2. Add all env vars from `.env.local.example` to Vercel project → Settings → Environment Variables
3. Update `NEXTAUTH_URL` to the Vercel domain
4. Update Google OAuth Authorized redirect URI to include the Vercel domain
5. `vercel --prod` (or push to main)

## Tech stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- NextAuth.js (Google OAuth)
- Supabase JS (server-side, service role)
- Zod (W5 form validation)

## Phase roadmap

| Phase | What | Status |
|---|---|---|
| γ W3 | Scaffold + auth + read-only kanban | this PR |
| γ W5 | Idea submission form (3 modes) | upcoming |
| γ W6 | Pillar config UI | upcoming |
| γ W7 | Metricool analytics readback | upcoming |
| δ | Multi-user, role-based access | future |
| δ | Multi-brand (Zoodleme onboarding) | future |

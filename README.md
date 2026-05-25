# WTM Content Studio

Creator console for [wtm-social-automation](https://github.com/anujyadav3760/wtm-social-automation). Phase γ of the platform build — Next.js 14 + Supabase + NextAuth (Google OAuth).

**Status (2026-05-25): Phase γ COMPLETE + render-safety hardening shipped.** Live at `social.whatsthemoat.com`.

## What's live

- **`/`** — kanban of every ContentIdea (autonomous cron + manual submissions). 8 status columns. Shows 🤖 intake badge, PNG×N/SVG×N source-asset links, ⚠ failure reasons (compliance/render/png_ocr), engagement panel (👁❤💬🔖🔗) when analytics-sync has run.
- **`/new`** — 3-tab idea submission form (subject / subject_plus / full_draft). POST writes a queued ContentIdea; Railway queue-drain picks it up within 15 min.
- **`/pillars`** — read + edit + add pillar configs (day_weights, descriptions, enable/disable). Strategist reads from this.
- **`/login`** — Google OAuth with allowlist (anuj4frens@gmail.com).
- **`/api/ideas`, `/api/pillars`** — backend APIs (NextAuth-gated).

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

# HireUp

A two-sided marketplace connecting teens (13–18) with employers and businesses for
part-time and one-time work. Three account types — **Teen**, **Employer**, **Business**
— each with their own onboarding and dashboard. Because this involves minors, money,
and in-person work, safety scaffolding (guardian consent, a `reports` table, admin
review gates) exists from Phase 1, not bolted on later.

Built against `HireUpClaudeCodeBuildSpec.md`. See that file for the full phased spec;
this README covers what's built and how to run it.

## Tech stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, hand-rolled
  shadcn/ui-style primitives (`src/components/ui`) restyled with a blue/white token set
  (`src/app/globals.css`), light/dark via `next-themes` class strategy.
- **Backend/DB/Auth:** Supabase (Postgres, Auth, Storage, Row Level Security, Realtime,
  Edge Functions). Schema + RLS policies live in `supabase/migrations/`.
- **Payments (Phase 3):** Stripe Connect (escrow-style holds) + Stripe Billing.
- **Maps (Phase 2):** Mapbox GL JS.
- **AI calls (Phase 2+):** Anthropic API, server-side only.
- **Deployment:** Vercel (frontend) + Supabase Cloud.
- **Testing:** Vitest (unit) + Playwright (critical e2e flows).

## Project status

- **Phase 1 — Core MVP: done.** Auth, role-based onboarding, dashboards, job
  browse/post/apply, application status tracking, ratings, guardian-consent
  scaffolding, `reports` stub.
- **Phase 2 — Engagement layer: done.** In-app chat (Realtime + presence typing
  indicator + read receipts + photo attachments via Storage), AI match score (Claude,
  cached in `job_matches`), saved jobs (filterable at `/saved`), nearby-jobs map
  (Mapbox GL + clustering, geocoded on post / lazily on first view), notifications
  (DB-trigger-driven, delivered live via Realtime), AI Assistant panel (job
  recommendations, Work Passport draft, interview prep — rate-limited per user).
- **Phase 3 — Trust, payments, monetization:** not started.

## Getting started

### 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com) (or run Supabase locally
   with the [Supabase CLI](https://supabase.com/docs/guides/local-development) +
   Docker: `supabase init && supabase start` — this repo's `supabase/config.toml` is
   already set up for that).
2. Copy `.env.example` to `.env.local` and fill in the values from your project's
   **Settings → API** page (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`).

### 2. Run the migrations

Against a hosted project:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Against a local Supabase (`supabase start`), migrations apply automatically on start,
or re-apply with:

```bash
npx supabase db reset
```

This creates every table in `supabase/migrations/` (`profiles`, `teen_profiles`,
`employer_profiles`, `jobs`, `applications`, `ratings`, `reports`) with RLS enabled and
explicit policies — see the migration files themselves for the policy rationale, each
is commented.

### 3. Install dependencies and run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

### 4. Environment variables

See `.env.example` for the full list with placeholder values. Never commit
`.env.local` (it's gitignored). Notes on a couple of non-obvious ones:

- `SUPABASE_SERVICE_ROLE_KEY` is server-only and bypasses RLS — only imported by
  `src/lib/supabase/admin.ts` (guarded with `server-only` so a client-bundle import is a
  build error), used for the one write no user should ever make themselves: confirming
  guardian consent from the emailed link (`/api/guardian/confirm`).
- `RESEND_API_KEY` (optional, not in the original spec's env var list) — the build spec
  doesn't include an email provider, so the guardian-confirmation email
  (`src/lib/email.ts`) falls back to logging the email + link to the server console when
  this is unset. Set it (plus `EMAIL_FROM`) to actually send guardian-confirmation
  emails via [Resend](https://resend.com).
- `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN` are for Phase 2/3,
  not yet wired up.

## Testing

```bash
npm run lint          # eslint
npm run typecheck      # tsc --noEmit (run after `npm run build` at least once, so
                        # Next's generated route types exist — see note below)
npm run test           # vitest unit tests
npm run test:e2e       # playwright e2e (needs a running dev server + real Supabase project)
```

**Note on `tsc --noEmit` in isolation:** Next.js 16 generates route param/props types
(e.g. `LayoutProps`) into `.next/types` during `next build`/`next dev`. Running
`tsc --noEmit` against a clean checkout (no `.next` yet) will report a spurious
`Cannot find name 'LayoutProps'` error — this isn't a real type error, `next build`'s
own "Running TypeScript" step is the authoritative check. Run `npm run build` once
first, or just trust `next build`'s output.

**Note on Playwright:** the e2e suite (`e2e/`) exercises the real signup → onboarding →
post/apply → rate flow against a real Supabase backend (Auth included) — there's no
mocking layer. It needs `.env.local` pointed at a real (or local) Supabase project with
the migrations applied, plus a dev server running (`npm run dev`).

## Verifying Row Level Security

The acceptance criteria for Phase 1 require RLS to be *tested*, not assumed. Because
this sandbox couldn't run Supabase's own Docker-based local stack, RLS was verified by
applying every migration to a bare local Postgres with a minimal stand-in for
Supabase's `auth` schema (`auth.uid()`/`auth.role()` reading Postgres session settings,
matching how PostgREST evaluates policies) and exercising real queries as two teen
accounts and two employer accounts. Confirmed: a teen cannot read another teen's
`teen_profiles`/`profiles` row; an employer cannot see another employer's applicants,
non-open jobs, or applications; duplicate applications and duplicate ratings are
rejected; a teen cannot self-confirm guardian consent; ratings only insert for a real
participant of a `filled` job. That scratch harness isn't part of this repo — re-run
migrations against a real Supabase project (or `supabase start`) to verify directly
against PostgREST. Phase 2's additional tables/triggers (`conversations`, `messages`,
`saved_jobs`, `job_matches`, `notifications` — including the two notification-creating
triggers) were verified the same way; `chat-images` Storage bucket policies
(migration `20260101000013`) couldn't be, since vanilla Postgres has no `storage`
schema — that one needs a real Supabase project to exercise.

## Directory structure

```
src/
  app/                  Routes (App Router) — pages, server actions, API routes
  components/           Shared components (DashboardShell, JobCard, RatingStars, ...)
  components/ui/        Restyled shadcn/ui-style primitives
  lib/supabase/         Browser/server/admin/middleware Supabase clients + hand-written
                         database types (regenerate with `supabase gen types` once a
                         real project is linked)
  lib/validations/      Zod schemas shared by forms and server actions
  lib/actions/          Server actions shared across routes (reports, ratings)
supabase/migrations/    SQL migrations — schema + RLS, one concern per file, applied
                         in filename order (dependency-ordered, not table-alphabetical
                         — see comments where that matters)
e2e/                    Playwright critical-path tests
```

## Known gaps / deliberate deferrals

- No email provider is specified in the build spec; guardian-confirmation emails log to
  the server console unless `RESEND_API_KEY` is set (see above).
- Availability is captured as a simple day checklist in onboarding (stored as jsonb);
  no time-range picker yet.
- Avatar upload isn't wired to Supabase Storage yet — `avatar_url` columns exist but
  nothing writes them.
- `src/lib/rate-limit.ts` is an in-memory, single-instance rate limiter (protects the
  match-score and AI-assistant Claude calls). Fine for one Next.js server; a
  multi-instance deployment needs a shared store (e.g. Upstash Redis) instead.
- The AI match score (`src/lib/match-score.ts`) and AI Assistant panel
  (`src/lib/actions/assistant.ts`) fall back to a heuristic score / a "not configured"
  message when `ANTHROPIC_API_KEY` is unset, so those pages don't crash without it —
  but you need a real key to see actual Claude-generated scores/explanations/drafts.
- Match scores are computed synchronously on `/jobs` and `/assistant` page loads (for
  every visible card, capped at a page size) to satisfy "match scores appear on job
  listings" literally; the `job_matches` cache keeps repeat visits fast, but a larger
  job catalog would want to precompute these in the background instead.
- "Bookmarks... filterable in `/dashboard/teen`" (Phase 2 acceptance criteria) is
  implemented as a dedicated `/saved` page (reachable from the teen nav, filterable by
  category) rather than embedded inside the `/dashboard/teen` route itself.
- Phase 3 (Work Passport, verification, Stripe payments, moderation queue, Premium) is
  not started — see the build spec.

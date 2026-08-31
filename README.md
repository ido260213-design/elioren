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
- **Phase 3 — Trust, payments, monetization: done.** Work Passport view (auto-compiled
  from completed jobs + ratings + skills, print/PDF export), verification tiers
  (`/admin/verification` manual review queue — no automated verification), Stripe
  Connect escrow payments gated on admin-verified employer status, guardian payout
  linking + withdrawal flow gated on a confirmed guardian link, admin moderation queue
  (`/admin/reports`, actionable: remove post / block user) built on the Phase 1
  `reports` table, keyword-filter content screening on chat messages and job posts,
  HireUp Premium (Stripe Billing subscriptions, feature-gated free tier, priority
  job-ranking boost, premium badge). See [Going live with Stripe](#going-live-with-stripe)
  before ever pointing this at real money.
- **Hardening pass (post-Phase-3): done.** A dedicated correctness/security review
  (automated first pass + a manual follow-up pass across every phase) found and fixed
  several real bugs before this app saw any real users or money — see
  [Hardening pass findings](#hardening-pass-findings) for the full list. The most
  serious: a signup-metadata privilege escalation to `admin`, and a SECURITY DEFINER
  withdrawal RPC that any authenticated user could call directly to drain an arbitrary
  teen's balance. Both are closed and re-verified against a real Postgres instance.

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
- `ANTHROPIC_API_KEY` powers the AI match score (`src/lib/match-score.ts`) and AI
  Assistant panel (`src/lib/actions/assistant.ts`). Without it, those fall back to a
  heuristic score / a "not configured" message rather than crashing.
- `NEXT_PUBLIC_MAPBOX_TOKEN` powers geocoding (`src/lib/geocode.ts`) and the `/map`
  view. Without it, job posts just never get lat/lng and `/map` shows a "not
  configured" message instead of a blank/broken map.
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` power escrow payments (`src/lib/actions/payments.ts`),
  guardian payout linking (`src/lib/actions/guardian-payout.ts`), and HireUp Premium
  billing (`src/lib/actions/premium.ts`) — all server-side via `src/lib/stripe.ts`.
  Without a key, those actions return a clear "not configured" error instead of
  throwing. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is documented per the build spec but
  currently unused — checkout/billing-portal use server-redirected Stripe-hosted
  sessions, not client-side Stripe.js, so no publishable key is needed yet.
- `ALLOW_STRIPE_LIVE_MODE` — leave unset/`false`. See
  [Going live with Stripe](#going-live-with-stripe).

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
schema — that one needs a real Supabase project to exercise. Phase 3's tables/triggers
(`verification_requests` and its approve/reject cascade into
`teen_profiles`/`employer_profiles.verification_status`, `blocked_users`,
`transactions`/`earnings_balance`/`guardian_payout_accounts` — including that
`payouts_enabled` can *only* be flipped by the service-role client, simulating the
Stripe webhook — and `subscriptions`) were verified the same way too, confirming in
particular: a teen can't approve their own verification request or self-confirm
`payouts_enabled`; `transactions`/`earnings_balance` reject direct authenticated-role
writes entirely (service-role only); an employer can't see another employer's blocks.
The post-Phase-3 hardening pass re-verified this area with real exploit attempts, not
just policy inspection — see [Hardening pass findings](#hardening-pass-findings) for
what that actually caught (a working privilege-escalation-to-admin path and a working
arbitrary-balance-drain path, both closed and re-confirmed blocked).

## Phase 3 acceptance criteria — self-check

- **"No job can be marked paid without passing through the admin manual-review gate"** —
  `fundJobEscrow` (`src/lib/actions/payments.ts`) checks
  `employer_profiles.verification_status === 'verified'` before creating a Stripe
  Checkout session; that field can only reach `'verified'` via
  `apply_verification_decision()`, a DB trigger that only fires from an admin's own
  `verification_requests` approval (RLS-verified above).
- **"A teen cannot withdraw funds without a confirmed guardian payout link"** —
  `withdrawEarnings` checks `guardian_payout_accounts.payouts_enabled` before calling
  Stripe at all; that column can only be set by the service-role client (the
  `account.updated` webhook handler), never by the teen (RLS-verified above).
- **"Reported content actually reaches the moderation queue and can be actioned"** —
  `/admin/reports` lists every open report; `ReportActions` offers "Remove post"
  (closes the reported job) and "Block user" (inserts a `blocked_users` row on the
  reporter's behalf) alongside "Dismiss", each resolving the report.
- **"Stripe wired in test mode by default"** — see
  [Going live with Stripe](#going-live-with-stripe) directly below.

## Hardening pass findings

After Phase 3 shipped, a dedicated correctness/security review (an automated pass,
then a manual follow-up across every phase) went looking for real bugs before this app
saw any real users or money. Every finding below was reproduced against a real
Postgres instance (or Node/browser runtime) before being fixed, and re-verified after.
Security-relevant findings first:

- **Admin privilege escalation** — `handle_new_user()` cast the client-supplied signup
  metadata `role` directly to the `user_role` enum, which includes `'admin'`.
  `supabase.auth.signUp()` is a public endpoint independent of the app's own
  teen/employer/business-only signup form — anyone could call it directly with
  `options.data.role: 'admin'` and get a real admin account. Fixed: the trigger now
  whitelists `teen`/`employer`/`business` only, anything else (including `admin`)
  falls back to `teen`.
- **Withdrawal RPC callable by anyone, for anyone** — the atomic `reserve_withdrawal()`/
  `release_withdrawal_reservation()` functions added to fix the race condition below
  are `SECURITY DEFINER`, and Postgres grants `EXECUTE` on new functions to `PUBLIC` by
  default. Neither function checked that `p_teen_id` belonged to the caller, so *any*
  authenticated user could call `reserve_withdrawal` directly (e.g. from the browser
  Supabase client, bypassing `withdrawEarnings()` entirely) with an arbitrary
  `p_teen_id` and silently drain that teen's `available_balance` — confirmed
  exploitable (an employer account draining a teen's balance with no Stripe transfer,
  no ownership check, no trace but the balance moving) before the fix. Fixed:
  `EXECUTE` revoked from `PUBLIC`, granted only to `service_role`
  (migration `20260101000019`).
- **Withdrawal race condition (TOCTOU)** — `withdrawEarnings()` read
  `available_balance`, checked it in JS, called Stripe, then wrote the balance back
  from that same stale read. Two concurrent withdrawals (two tabs, a double-submit)
  could both pass the check against the same starting balance and both get a real
  Stripe transfer, with the final write overwriting rather than compounding — the DB
  balance ending up higher than it should while the platform paid out more than the
  teen ever had available. Fixed: `reserve_withdrawal()` does the check-and-decrement
  as one atomically-guarded `UPDATE`, called *before* Stripe is touched; a failed
  transfer compensates via `release_withdrawal_reservation()`.
- **Stripe webhook double-crediting on retry** — `checkout.session.completed` always
  inserted a new `hold` transaction and bumped `pending_balance`, with no idempotency
  check. Stripe delivers webhooks at-least-once and retries on any ambiguous response;
  a retried delivery would double-credit escrow for one real charge. Fixed: skip if a
  `hold` already exists for the job/teen pair before inserting.
- **Auth links didn't actually sign anyone in** — `@supabase/ssr`'s clients default to
  the PKCE flow, where every email link (signup confirmation, password reset) redirects
  back with a `?code=` that must be exchanged for a session server-side — landing on
  the page alone doesn't authenticate you. There was no `/auth/callback` route to do
  that exchange, so on a real Supabase Cloud project (which requires email confirmation
  by default), a password-reset link would land on `/reset-password` with no session,
  and `resetPassword()` would just fail with "link has expired." Fixed: added
  `/auth/callback` (calls `exchangeCodeForSession`), pointed both
  `resetPasswordForEmail`'s `redirectTo` and `signUp`'s `emailRedirectTo` at it.

Correctness/UX findings:

- **Job search broke on a comma** — `/jobs`'s search built a PostgREST `.or()` filter
  string via raw interpolation of the user's query; `,`/`(`/`)` are that filter
  syntax's own delimiters, so a location search like "Austin, TX" (an extremely common
  input) broke the query and silently returned zero results. Fixed: strip those
  characters before building the filter.
- **`SaveJobButton` rendered (and acted on) for non-teen users on `/jobs`** — the
  listing page passed a `saved` boolean whenever *any* user was logged in, not just
  teens (the per-job-detail page already gated this correctly). An employer clicking
  the bookmark icon would hit `saveJob()`'s `requireRole(['teen'])` check and get
  silently redirected to their own dashboard. Fixed: only pass a defined `saved` value
  for teens.
- **Admin role hit a dead-end 404 on `/profile`** — the page branched teen vs.
  employer/business only; an admin (no `teen_profiles`/`employer_profiles` row) fell
  into the employer branch and got redirected to a nonexistent `/onboarding/admin`.
  Fixed: admins are sent to `/admin` instead. Also added a bare `/dashboard` → correct
  role-dashboard redirect (previously a 404) and a logout button to `/admin`'s header
  (previously unreachable from anywhere in the admin panel).
- **Stale "Release payment" button** — the button's "released" state was local
  component state that reset on every page reload, so a refreshed `/applications` page
  showed the button again even after payment had already been released (clicking it
  again was a harmless server-side no-op, but confusing). Fixed: the page now checks
  for an existing `release` transaction and passes the real state in.
- Added Stripe idempotency keys to both Checkout Session creations (a double-click or
  slow-network resubmit now gets back the same session instead of risking a second real
  charge) and wrapped the remaining un-caught Stripe API calls in `try`/`catch` so a
  transient Stripe error returns a friendly message instead of an unhandled crash.
- Added `/billing` (employer/business transaction history — there was previously no
  in-app way for an employer to see what they'd funded to escrow) as a small,
  genuinely-missing feature alongside the fixes above.

## Going live with Stripe

Every Stripe-calling action (`fundJobEscrow`, `withdrawEarnings`,
`linkGuardianPayoutAccount`, `startPremiumCheckout`, `openBillingPortal`) calls
`assertStripeTestMode()` (`src/lib/stripe.ts`) first. It throws — refusing the API call
— unless `STRIPE_SECRET_KEY` looks like a test-mode key (`sk_test_`/`rk_test_`) *or*
`ALLOW_STRIPE_LIVE_MODE=true` is set. That env var is never set by this codebase, by a
migration, or by any default — flipping it is the one, explicit, separate decision the
build spec asks for before real money can move. Don't set it in `.env.local` for local
dev; don't set it in a deployment's env vars without that being the actual decision to
go live.

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
- Content moderation (`src/lib/moderation.ts`) is a small keyword filter, not an
  exhaustive profanity/safety list or an LLM call — explicitly a starting point per the
  build spec ("keyword filter or an LLM moderation call"); swap in a Claude moderation
  call there for stronger coverage before this goes near production.
- "HireUp Premium... feature-gating middleware" is implemented as inline checks inside
  the relevant server actions (`applyToJob`, `postJob` — see `src/lib/premium.ts`),
  not as Next.js `middleware.ts`/`proxy.ts` — same enforcement point (nothing gets
  written to the DB either way), different mechanism.
- No signup flow grants the `admin` role (by design — `/signup` only offers
  teen/employer/business). To create the first admin for local testing, update a
  user's `profiles.role` directly using the **service-role** key (the
  `prevent_role_change` trigger blocks this for a normal authenticated session, by
  design, but the service role bypasses RLS): `update public.profiles set role =
  'admin' where id = '<user-uuid>';` run via the Supabase SQL editor or
  `service_role`-authenticated client — never exposed as an in-app action.
- Stripe integration (escrow, guardian payouts, Premium billing, the webhook handler)
  is written against Stripe's documented Connect/Billing/Checkout APIs but couldn't be
  exercised end-to-end in this sandbox (no Stripe test account). Test thoroughly in
  Stripe test mode against a real test account before relying on it — start with
  Stripe's CLI (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`) to
  exercise the webhook handler locally.

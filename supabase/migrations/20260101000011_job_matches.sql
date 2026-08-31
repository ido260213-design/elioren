-- job_matches: cached AI match score/explanation for a (teen, job) pair, so the Claude
-- call in src/app/api/match-score/route.ts isn't re-run on every page view. The route
-- treats a cached row as stale (and recomputes) whenever teen_profiles.updated_at or
-- jobs.updated_at is newer than computed_at.

create table public.job_matches (
  teen_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  explanation text not null,
  computed_at timestamptz not null default now(),
  primary key (teen_id, job_id)
);

alter table public.job_matches enable row level security;

create policy "job_matches_select_own"
  on public.job_matches for select
  to authenticated
  using (teen_id = auth.uid());

-- The teen's own signed-in session computes/caches their own match scores (the Claude
-- call happens server-side in the route handler, but under the teen's own RLS session
-- — no service-role needed since they're only ever writing their own row).
create policy "job_matches_insert_own"
  on public.job_matches for insert
  to authenticated
  with check (teen_id = auth.uid());

create policy "job_matches_update_own"
  on public.job_matches for update
  to authenticated
  using (teen_id = auth.uid())
  with check (teen_id = auth.uid());

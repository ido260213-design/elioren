-- reports: safety scaffolding stubbed in Phase 1 so the data model exists before
-- Phase 3 builds an admin moderation queue on top of it. No admin UI yet — this table
-- just needs to durably capture reports as they come in.

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason text not null,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

create index reports_target_idx on public.reports(target_type, target_id);
create index reports_status_idx on public.reports(status);

alter table public.reports enable row level security;

create policy "reports_select_own"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid());

-- Phase 3's admin moderation queue reads every report; grant that now so the queue can
-- be built later without another migration.
create policy "reports_select_admin"
  on public.reports for select
  to authenticated
  using (public.is_admin());

create policy "reports_insert_own"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- Only an admin can action a report (Phase 3 moderation queue).
create policy "reports_update_admin"
  on public.reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

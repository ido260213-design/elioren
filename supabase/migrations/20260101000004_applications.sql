-- applications: a teen applying to a job. Duplicate applies are blocked at the DB level.

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  teen_id uuid not null references public.profiles(id) on delete cascade,
  status public.application_status not null default 'applied',
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, teen_id)
);

create index applications_job_id_idx on public.applications(job_id);
create index applications_teen_id_idx on public.applications(teen_id);

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

alter table public.applications enable row level security;

-- Visible only to the applying teen and the employer who owns the job.
create policy "applications_select_participant"
  on public.applications for select
  to authenticated
  using (
    teen_id = auth.uid()
    or exists (select 1 from public.jobs j where j.id = applications.job_id and j.employer_id = auth.uid())
  );

create policy "applications_select_admin"
  on public.applications for select
  to authenticated
  using (public.is_admin());

create policy "applications_insert_own"
  on public.applications for insert
  to authenticated
  with check (
    teen_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teen')
    and exists (select 1 from public.jobs j where j.id = applications.job_id and j.status = 'open')
  );

-- Only the owning employer moves an application through Applied -> Viewed -> Interview
-- -> Accepted/Rejected; the applying teen has no update policy (they only track status).
create policy "applications_update_by_employer"
  on public.applications for update
  to authenticated
  using (exists (select 1 from public.jobs j where j.id = applications.job_id and j.employer_id = auth.uid()))
  with check (exists (select 1 from public.jobs j where j.id = applications.job_id and j.employer_id = auth.uid()));

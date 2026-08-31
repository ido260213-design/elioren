-- jobs: postings created by employer/business accounts.

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null,
  location_text text not null,
  lat double precision,
  lng double precision,
  pay_type public.pay_type not null,
  pay_amount numeric(10, 2) not null check (pay_amount >= 0),
  age_min smallint not null default 13 check (age_min >= 13),
  age_max smallint not null default 18 check (age_max <= 18),
  workers_needed integer not null default 1 check (workers_needed >= 1),
  description text not null,
  status public.job_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_age_range check (age_min <= age_max)
);

create index jobs_employer_id_idx on public.jobs(employer_id);
create index jobs_status_idx on public.jobs(status);
create index jobs_category_idx on public.jobs(category);

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;

-- Public browse/search: anyone (including anonymous visitors) can read open jobs.
create policy "jobs_select_public_open"
  on public.jobs for select
  using (status = 'open');

create policy "jobs_select_own"
  on public.jobs for select
  to authenticated
  using (employer_id = auth.uid());

create policy "jobs_select_admin"
  on public.jobs for select
  to authenticated
  using (public.is_admin());

create policy "jobs_insert_own"
  on public.jobs for insert
  to authenticated
  with check (
    employer_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('employer', 'business'))
  );

create policy "jobs_update_own"
  on public.jobs for update
  to authenticated
  using (employer_id = auth.uid())
  with check (employer_id = auth.uid());

create policy "jobs_delete_own"
  on public.jobs for delete
  to authenticated
  using (employer_id = auth.uid());

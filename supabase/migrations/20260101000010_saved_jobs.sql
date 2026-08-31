-- saved_jobs: teen bookmarks.

create table public.saved_jobs (
  teen_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (teen_id, job_id)
);

alter table public.saved_jobs enable row level security;

create policy "saved_jobs_select_own"
  on public.saved_jobs for select
  to authenticated
  using (teen_id = auth.uid());

create policy "saved_jobs_insert_own"
  on public.saved_jobs for insert
  to authenticated
  with check (
    teen_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teen')
  );

create policy "saved_jobs_delete_own"
  on public.saved_jobs for delete
  to authenticated
  using (teen_id = auth.uid());

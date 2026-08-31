-- employer_profiles: 1:1 extension of an 'employer' or 'business' profile.

create table public.employer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  account_type public.employer_account_type not null,
  verification_status public.verification_status not null default 'unverified',
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger employer_profiles_set_updated_at
  before update on public.employer_profiles
  for each row execute function public.set_updated_at();

alter table public.employer_profiles enable row level security;

create policy "employer_profiles_select_own"
  on public.employer_profiles for select
  to authenticated
  using (user_id = auth.uid());

-- Job listings are public once open (see jobs_select_public below) and a listing needs
-- to show who's hiring, so the poster's public-facing display name/avatar/verification
-- badge are readable by anyone whenever that employer currently has at least one open job.
create policy "employer_profiles_select_public_via_open_job"
  on public.employer_profiles for select
  using (
    exists (
      select 1 from public.jobs j
      where j.employer_id = employer_profiles.user_id
        and j.status = 'open'
    )
  );

create policy "employer_profiles_select_by_applicant"
  on public.employer_profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where j.employer_id = employer_profiles.user_id
        and a.teen_id = auth.uid()
    )
  );

create policy "employer_profiles_select_admin"
  on public.employer_profiles for select
  to authenticated
  using (public.is_admin());

create policy "employer_profiles_insert_own"
  on public.employer_profiles for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('employer', 'business'))
  );

create policy "employer_profiles_update_own"
  on public.employer_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- verification_status is only ever promoted by the Phase 3 admin review flow, never by
-- the employer themself, even though they own the row.
create or replace function public.prevent_verification_status_tamper()
returns trigger
language plpgsql
as $$
begin
  if new.verification_status is distinct from old.verification_status and auth.role() <> 'service_role' and not public.is_admin() then
    raise exception 'verification_status can only be changed by an admin review';
  end if;
  return new;
end;
$$;

create trigger employer_profiles_prevent_verification_tamper
  before update on public.employer_profiles
  for each row execute function public.prevent_verification_status_tamper();

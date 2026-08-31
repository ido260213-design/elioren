-- teen_profiles: 1:1 extension of a 'teen' profile.

create table public.teen_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null,
  date_of_birth date not null,
  skills text[] not null default '{}',
  hobbies text[] not null default '{}',
  bio text,
  availability jsonb not null default '{}'::jsonb,
  avatar_url text,
  guardian_email text not null,
  guardian_confirmation_token uuid not null default gen_random_uuid(),
  guardian_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teen_age_range check (date_of_birth <= (current_date - interval '13 years') and date_of_birth > (current_date - interval '19 years'))
);

create trigger teen_profiles_set_updated_at
  before update on public.teen_profiles
  for each row execute function public.set_updated_at();

alter table public.teen_profiles enable row level security;

-- The teen themself can always read/write their own row.
create policy "teen_profiles_select_own"
  on public.teen_profiles for select
  to authenticated
  using (user_id = auth.uid());

-- An employer/business may read a teen's profile only once that teen has applied to
-- one of their job postings.
create policy "teen_profiles_select_by_employer_of_applicant"
  on public.teen_profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.teen_id = teen_profiles.user_id
        and j.employer_id = auth.uid()
    )
  );

create policy "teen_profiles_select_admin"
  on public.teen_profiles for select
  to authenticated
  using (public.is_admin());

create policy "teen_profiles_insert_own"
  on public.teen_profiles for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teen')
  );

create policy "teen_profiles_update_own"
  on public.teen_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A teen can update their own row (bio, skills, availability, ...) but must never be
-- able to self-confirm guardian consent or mint a new confirmation token — those are
-- written only by the server using the service-role key (see /api/guardian/confirm).
create or replace function public.prevent_guardian_confirmation_tamper()
returns trigger
language plpgsql
as $$
begin
  if auth.role() <> 'service_role' then
    if new.guardian_confirmed_at is distinct from old.guardian_confirmed_at
      or new.guardian_confirmation_token is distinct from old.guardian_confirmation_token then
      raise exception 'guardian confirmation fields can only be set by the server';
    end if;
  end if;
  return new;
end;
$$;

create trigger teen_profiles_prevent_guardian_tamper
  before update on public.teen_profiles
  for each row execute function public.prevent_guardian_confirmation_tamper();

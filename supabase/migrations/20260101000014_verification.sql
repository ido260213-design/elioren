-- Phase 3: verification tiers. teen_profiles gets the same verification_status column
-- employer_profiles already has; verification_requests is the manual review queue an
-- admin works from — no automated verification in this pass (flagged as a later
-- upgrade in the build spec).

alter table public.teen_profiles
  add column verification_status public.verification_status not null default 'unverified';

create trigger teen_profiles_prevent_verification_tamper
  before update on public.teen_profiles
  for each row execute function public.prevent_verification_status_tamper();

create type public.verification_request_status as enum ('pending', 'approved', 'rejected');

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  note text,
  status public.verification_request_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index verification_requests_status_idx on public.verification_requests(status);

alter table public.verification_requests enable row level security;

create policy "verification_requests_select_own"
  on public.verification_requests for select
  to authenticated
  using (user_id = auth.uid());

create policy "verification_requests_select_admin"
  on public.verification_requests for select
  to authenticated
  using (public.is_admin());

create policy "verification_requests_insert_own"
  on public.verification_requests for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('teen', 'employer', 'business'))
    and not exists (
      select 1 from public.verification_requests vr
      where vr.user_id = auth.uid() and vr.status = 'pending'
    )
  );

-- Only an admin approves/rejects; reviewed_by/reviewed_at/status are set together by
-- the review action (see prevent_verification_request_tamper below for what's locked).
create policy "verification_requests_update_admin"
  on public.verification_requests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.prevent_verification_request_tamper()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is distinct from old.user_id
    or new.note is distinct from old.note
    or new.created_at is distinct from old.created_at then
    raise exception 'only status/reviewed_by/reviewed_at may change on a verification request';
  end if;
  return new;
end;
$$;

create trigger verification_requests_prevent_tamper
  before update on public.verification_requests
  for each row execute function public.prevent_verification_request_tamper();

-- Cascades an approval/rejection into the account's own verification_status. Runs as
-- SECURITY DEFINER because the admin reviewing the request doesn't own the
-- teen_profiles/employer_profiles row being updated (their own RLS update policies
-- are scoped to `user_id = auth.uid()`), and because it needs to bypass those tables'
-- own prevent_verification_status_tamper() trigger's row-visibility requirements —
-- that trigger still checks public.is_admin() against the *calling* session, so the
-- reviewing admin's identity is what's actually authorizing the write, not this
-- function's elevated privilege.
create or replace function public.apply_verification_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role public.user_role;
begin
  if new.status = old.status then
    return new;
  end if;

  new.reviewed_by = auth.uid();
  new.reviewed_at = now();

  select role into target_role from public.profiles where id = new.user_id;

  if new.status = 'approved' then
    if target_role = 'teen' then
      update public.teen_profiles set verification_status = 'verified' where user_id = new.user_id;
    elsif target_role in ('employer', 'business') then
      update public.employer_profiles set verification_status = 'verified' where user_id = new.user_id;
    end if;
  elsif new.status = 'rejected' then
    if target_role = 'teen' then
      update public.teen_profiles set verification_status = 'unverified' where user_id = new.user_id;
    elsif target_role in ('employer', 'business') then
      update public.employer_profiles set verification_status = 'unverified' where user_id = new.user_id;
    end if;
  end if;

  return new;
end;
$$;

create trigger verification_requests_apply_decision
  before update on public.verification_requests
  for each row execute function public.apply_verification_decision();

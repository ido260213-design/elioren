-- profiles: extends auth.users with a role and is the anchor every other table FKs to.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- Returns true when the current authenticated user's profile role is 'admin'.
-- SECURITY DEFINER so it can read profiles regardless of the caller's own RLS grants.
-- Defined here (not in the extensions/enums migration) because a `language sql`
-- function body is resolved against real relations at CREATE FUNCTION time, and this
-- one queries public.profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;

-- A user may read only their own profile row (teen_profiles / employer_profiles have
-- their own, broader read policies for the cases where someone else legitimately
-- needs to see a name/avatar).
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- Row creation happens via the handle_new_user trigger below (SECURITY DEFINER), not
-- direct client inserts, so no INSERT policy is needed for authenticated users.

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Prevent a user from ever changing their own role through the update policy above
-- (e.g. a teen promoting themselves to admin). Only a service-role/administrative
-- process may change role.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' then
    raise exception 'role cannot be changed directly';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- Auto-create a profiles row whenever a new auth.users row is created. The role is
-- read from the signup call's user_metadata (supabase.auth.signUp({ options: { data: { role } } })).
--
-- SECURITY: raw_user_meta_data is client-supplied — supabase.auth.signUp() is a public
-- endpoint callable directly with just the anon key (bypassing our Next.js server
-- action and its zod validation entirely), so a caller can pass options.data.role set
-- to literally anything, including 'admin'. Only ever promote to 'teen', 'employer' or
-- 'business' from that value; 'admin' (and anything else) always falls back to 'teen'.
-- There is deliberately no self-service path to the admin role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, email)
  values (
    new.id,
    case
      when (new.raw_user_meta_data ->> 'role') in ('teen', 'employer', 'business')
        then (new.raw_user_meta_data ->> 'role')::public.user_role
      else 'teen'
    end,
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Phase 3: blocking, built on top of the reports table stubbed in Phase 1. Blocking is
-- one-directional (blocker -> blocked) and enforced at the application layer (job
-- apply, send message) rather than as a blanket RLS rule, so an admin/moderation
-- action can still see a blocked user's existing content.

create table public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocked_users_no_self_block check (blocker_id <> blocked_id)
);

alter table public.blocked_users enable row level security;

create policy "blocked_users_select_own"
  on public.blocked_users for select
  to authenticated
  using (blocker_id = auth.uid() or public.is_admin());

-- A user can block someone themselves; an admin can also impose a block while
-- actioning a report (see the admin moderation queue).
create policy "blocked_users_insert_own_or_admin"
  on public.blocked_users for insert
  to authenticated
  with check (blocker_id = auth.uid() or public.is_admin());

create policy "blocked_users_delete_own_or_admin"
  on public.blocked_users for delete
  to authenticated
  using (blocker_id = auth.uid() or public.is_admin());

-- notifications: in-app now, schema shaped so push can be layered on later without a
-- rework (a `payload` jsonb bag plus a `type` discriminator is enough for a push
-- provider to consume the same rows).

create type public.notification_type as enum ('application_status_changed', 'new_message');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

-- Only the mark-as-read transition is allowed, and only by the owner — notifications
-- are otherwise created solely by the triggers below (SECURITY DEFINER, bypass RLS),
-- never inserted directly by a client.
create policy "notifications_update_mark_read_own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.prevent_notification_content_edit()
returns trigger
language plpgsql
as $$
begin
  if new.type is distinct from old.type
    or new.payload is distinct from old.payload
    or new.user_id is distinct from old.user_id then
    raise exception 'notifications are immutable except for read_at';
  end if;
  return new;
end;
$$;

create trigger notifications_prevent_content_edit
  before update on public.notifications
  for each row execute function public.prevent_notification_content_edit();

alter publication supabase_realtime add table public.notifications;

-- Notify the applying teen whenever an employer moves their application to a new status.
create or replace function public.notify_application_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (user_id, type, payload)
    values (
      new.teen_id,
      'application_status_changed',
      jsonb_build_object('application_id', new.id, 'job_id', new.job_id, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger applications_notify_status_changed
  after update on public.applications
  for each row execute function public.notify_application_status_changed();

-- Notify the *other* participant of the conversation whenever a message comes in.
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_id uuid;
begin
  select case when a.teen_id = new.sender_id then j.employer_id else a.teen_id end
    into recipient_id
  from public.conversations c
  join public.applications a on a.id = c.application_id
  join public.jobs j on j.id = a.job_id
  where c.id = new.conversation_id;

  if recipient_id is not null then
    insert into public.notifications (user_id, type, payload)
    values (
      recipient_id,
      'new_message',
      jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id, 'sender_id', new.sender_id)
    );
  end if;

  return new;
end;
$$;

create trigger messages_notify_new_message
  after insert on public.messages
  for each row execute function public.notify_new_message();

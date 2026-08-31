-- Phase 2: in-app chat, one conversation per application.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "conversations_select_participant"
  on public.conversations for select
  to authenticated
  using (
    exists (
      select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.id = conversations.application_id
        and (a.teen_id = auth.uid() or j.employer_id = auth.uid())
    )
  );

-- A conversation is opened by either participant once the application exists — most
-- naturally the employer, when they first want to message an applicant.
create policy "conversations_insert_participant"
  on public.conversations for insert
  to authenticated
  with check (
    exists (
      select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.id = conversations.application_id
        and (a.teen_id = auth.uid() or j.employer_id = auth.uid())
    )
  );

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  image_url text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_body_or_image check (body is not null or image_url is not null)
);

create index messages_conversation_id_idx on public.messages(conversation_id, created_at);

alter table public.messages enable row level security;

create policy "messages_select_participant"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      join public.applications a on a.id = c.application_id
      join public.jobs j on j.id = a.job_id
      where c.id = messages.conversation_id
        and (a.teen_id = auth.uid() or j.employer_id = auth.uid())
    )
  );

create policy "messages_insert_participant"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.conversations c
      join public.applications a on a.id = c.application_id
      join public.jobs j on j.id = a.job_id
      where c.id = messages.conversation_id
        and (a.teen_id = auth.uid() or j.employer_id = auth.uid())
    )
  );

-- A participant may mark a message as read, but only the recipient (not the sender,
-- and not any field but read_at).
create policy "messages_update_mark_read"
  on public.messages for update
  to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1
      from public.conversations c
      join public.applications a on a.id = c.application_id
      join public.jobs j on j.id = a.job_id
      where c.id = messages.conversation_id
        and (a.teen_id = auth.uid() or j.employer_id = auth.uid())
    )
  )
  with check (
    sender_id <> auth.uid()
    and exists (
      select 1
      from public.conversations c
      join public.applications a on a.id = c.application_id
      join public.jobs j on j.id = a.job_id
      where c.id = messages.conversation_id
        and (a.teen_id = auth.uid() or j.employer_id = auth.uid())
    )
  );

-- RLS can't restrict which *columns* an UPDATE touches, only which rows — without this,
-- the read-receipt policy above would let a recipient silently edit body/image_url too.
create or replace function public.prevent_message_content_edit()
returns trigger
language plpgsql
as $$
begin
  if new.body is distinct from old.body
    or new.image_url is distinct from old.image_url
    or new.sender_id is distinct from old.sender_id
    or new.conversation_id is distinct from old.conversation_id then
    raise exception 'messages are immutable except for read_at';
  end if;
  return new;
end;
$$;

create trigger messages_prevent_content_edit
  before update on public.messages
  for each row execute function public.prevent_message_content_edit();

alter publication supabase_realtime add table public.messages;

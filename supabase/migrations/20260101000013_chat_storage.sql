-- Storage bucket for chat photo attachments. Private (not `public`) — access is
-- gated by the RLS policies below, mirroring the messages table's own access rule
-- (only the two participants of the conversation an object's path names).
--
-- Path convention: chat-images/<conversation_id>/<uuid>.<ext> — the policies check
-- that the requesting user participates in the conversation named by the path's first
-- folder segment ((storage.foldername(name))[1]).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', false, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "chat_images_select_participant"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat-images'
    and exists (
      select 1
      from public.conversations c
      join public.applications a on a.id = c.application_id
      join public.jobs j on j.id = a.job_id
      where c.id::text = (storage.foldername(name))[1]
        and (a.teen_id = auth.uid() or j.employer_id = auth.uid())
    )
  );

create policy "chat_images_insert_participant"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-images'
    and exists (
      select 1
      from public.conversations c
      join public.applications a on a.id = c.application_id
      join public.jobs j on j.id = a.job_id
      where c.id::text = (storage.foldername(name))[1]
        and (a.teen_id = auth.uid() or j.employer_id = auth.uid())
    )
  );

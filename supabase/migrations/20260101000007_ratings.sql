-- ratings: left by one participant of a completed job about the other, once each.

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  rater_id uuid not null references public.profiles(id) on delete cascade,
  ratee_id uuid not null references public.profiles(id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  unique (job_id, rater_id, ratee_id),
  constraint ratings_no_self_rating check (rater_id <> ratee_id)
);

create index ratings_job_id_idx on public.ratings(job_id);
create index ratings_ratee_id_idx on public.ratings(ratee_id);

alter table public.ratings enable row level security;

create policy "ratings_select_participant"
  on public.ratings for select
  to authenticated
  using (rater_id = auth.uid() or ratee_id = auth.uid());

create policy "ratings_select_admin"
  on public.ratings for select
  to authenticated
  using (public.is_admin());

-- Insertable only by a genuine participant (teen who was accepted, or the employer who
-- owns the job) of a job whose status is 'filled', rating the other participant, and
-- only once per (job, rater, ratee) — the unique constraint above backstops this.
create policy "ratings_insert_by_participant_of_filled_job"
  on public.ratings for insert
  to authenticated
  with check (
    rater_id = auth.uid()
    and exists (
      select 1
      from public.jobs j
      join public.applications a on a.job_id = j.id and a.status = 'accepted'
      where j.id = ratings.job_id
        and j.status = 'filled'
        and (
          (auth.uid() = a.teen_id and ratee_id = j.employer_id)
          or (auth.uid() = j.employer_id and ratee_id = a.teen_id)
        )
    )
  );

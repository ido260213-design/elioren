-- HireUp — extensions and shared enum types

create extension if not exists pgcrypto with schema extensions;

create type public.user_role as enum ('teen', 'employer', 'business', 'admin');
create type public.employer_account_type as enum ('employer', 'business');
create type public.verification_status as enum ('unverified', 'pending', 'verified');
create type public.pay_type as enum ('hourly', 'fixed');
create type public.job_status as enum ('open', 'filled', 'closed');
create type public.application_status as enum ('applied', 'viewed', 'interview', 'accepted', 'rejected');
create type public.report_target_type as enum ('job', 'profile', 'message');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

-- Generic "touch updated_at" trigger function, reused by every table below that has one.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Note: public.is_admin() is defined in 20260101000002_profiles.sql, right after the
-- profiles table it queries — a `language sql` function body is parsed (and its
-- referenced relations resolved) at CREATE FUNCTION time, so it can't be defined here
-- before that table exists.

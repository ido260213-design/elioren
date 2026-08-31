-- Phase 3: Stripe Connect escrow-style payments.
--
-- IMPORTANT CONSTRAINT (flagged per the build spec, not silently worked around):
-- Stripe Connect payouts generally require the account holder to be an adult, so a
-- minor typically can't hold a Connect account directly. Payouts route through a
-- parent/guardian's verified Stripe account instead (guardian_payout_accounts),
-- required before a teen's *first withdrawal* — not before signup, and not before
-- they can be paid into escrow/their in-app balance.
--
-- transactions and earnings_balance intentionally have NO insert/update policy for
-- `authenticated` at all — every write to real money state goes through server
-- actions using the service-role client, after calling the Stripe API and getting a
-- real result back. RLS only grants participants (and admins) read access here.

create type public.transaction_type as enum ('hold', 'release', 'refund', 'payout');
create type public.transaction_status as enum ('pending', 'succeeded', 'failed', 'canceled');

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id),
  employer_id uuid not null references public.profiles(id),
  teen_id uuid not null references public.profiles(id),
  amount numeric(10, 2) not null check (amount >= 0),
  type public.transaction_type not null,
  status public.transaction_status not null default 'pending',
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_teen_id_idx on public.transactions(teen_id);
create index transactions_employer_id_idx on public.transactions(employer_id);
create index transactions_job_id_idx on public.transactions(job_id);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

alter table public.transactions enable row level security;

create policy "transactions_select_participant"
  on public.transactions for select
  to authenticated
  using (employer_id = auth.uid() or teen_id = auth.uid() or public.is_admin());

create table public.earnings_balance (
  teen_id uuid primary key references public.profiles(id) on delete cascade,
  available_balance numeric(10, 2) not null default 0 check (available_balance >= 0),
  pending_balance numeric(10, 2) not null default 0 check (pending_balance >= 0),
  updated_at timestamptz not null default now()
);

create trigger earnings_balance_set_updated_at
  before update on public.earnings_balance
  for each row execute function public.set_updated_at();

alter table public.earnings_balance enable row level security;

create policy "earnings_balance_select_own"
  on public.earnings_balance for select
  to authenticated
  using (teen_id = auth.uid() or public.is_admin());

create table public.guardian_payout_accounts (
  teen_id uuid primary key references public.profiles(id) on delete cascade,
  guardian_email text not null,
  stripe_connect_account_id text not null,
  payouts_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger guardian_payout_accounts_set_updated_at
  before update on public.guardian_payout_accounts
  for each row execute function public.set_updated_at();

alter table public.guardian_payout_accounts enable row level security;

create policy "guardian_payout_accounts_select_own"
  on public.guardian_payout_accounts for select
  to authenticated
  using (teen_id = auth.uid() or public.is_admin());

-- The teen kicks off linking (creates the row, pointing at a Stripe Connect account
-- created server-side for their guardian) — but payouts_enabled can only ever be set
-- once Stripe itself confirms the guardian's account is fully onboarded, via a
-- webhook using the service-role client.
create policy "guardian_payout_accounts_insert_own"
  on public.guardian_payout_accounts for insert
  to authenticated
  with check (
    teen_id = auth.uid()
    and payouts_enabled = false
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teen')
  );

create or replace function public.prevent_payout_enabled_tamper()
returns trigger
language plpgsql
as $$
begin
  if new.payouts_enabled is distinct from old.payouts_enabled and auth.role() <> 'service_role' then
    raise exception 'payouts_enabled can only be set by the Stripe webhook handler';
  end if;
  return new;
end;
$$;

create trigger guardian_payout_accounts_prevent_tamper
  before update on public.guardian_payout_accounts
  for each row execute function public.prevent_payout_enabled_tamper();

-- Atomically reserves p_amount from a teen's available balance for a withdrawal.
-- withdrawEarnings() previously read the balance, checked it in JS, then called Stripe
-- and wrote the new balance back from that same stale read — two concurrent withdraw
-- requests (two tabs/devices, or a double-submit) could both pass the check against the
-- same starting balance and both get a real Stripe transfer, with the DB balance write
-- at the end simply overwriting rather than compounding, silently losing track of how
-- much was actually paid out. Doing the check-and-decrement as a single guarded UPDATE
-- makes it atomic under Postgres's row-level locking: at most one concurrent caller can
-- win the race for a given balance. SECURITY DEFINER because earnings_balance has no
-- authenticated-role update policy; callers must already be authorized (withdrawEarnings
-- requires the teen role and passes the session's own user id, never client input).
create or replace function public.reserve_withdrawal(p_teen_id uuid, p_amount numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows int;
begin
  update public.earnings_balance
  set available_balance = available_balance - p_amount
  where teen_id = p_teen_id and available_balance >= p_amount;

  get diagnostics updated_rows = row_count;
  return updated_rows > 0;
end;
$$;

-- Compensates a reserve_withdrawal() reservation back onto the balance when the Stripe
-- transfer that was gated on it fails after the reservation succeeded.
create or replace function public.release_withdrawal_reservation(p_teen_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.earnings_balance
  set available_balance = available_balance + p_amount
  where teen_id = p_teen_id;
end;
$$;

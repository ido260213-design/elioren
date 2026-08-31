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

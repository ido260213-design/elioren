-- Phase 3: HireUp Premium — Stripe Billing subscriptions. Written only by the
-- checkout-session/webhook server code (service-role client), same rationale as
-- transactions/earnings_balance: this is billing state, not user-editable data.

create type public.subscription_status as enum ('active', 'past_due', 'canceled', 'incomplete');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null,
  status public.subscription_status not null default 'incomplete',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own"
  on public.subscriptions for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

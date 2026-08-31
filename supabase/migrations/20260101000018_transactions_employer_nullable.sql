-- A 'payout' transaction (teen withdrawal to their guardian's Stripe account) has no
-- employer party — forcing a fake FK value there would be worse than a null.
alter table public.transactions alter column employer_id drop not null;

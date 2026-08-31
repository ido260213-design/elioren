-- Postgres grants EXECUTE on newly created functions to PUBLIC by default, which
-- includes the `authenticated` (and even `anon`) role. reserve_withdrawal() and
-- release_withdrawal_reservation() are SECURITY DEFINER and never checked that
-- p_teen_id belonged to the caller — the intent was always for them to be called only
-- from withdrawEarnings() via the service-role client, but as originally migrated,
-- ANY authenticated user could call reserve_withdrawal() directly (e.g. via the
-- browser Supabase client) with an arbitrary p_teen_id and silently drain that teen's
-- available_balance, with no Stripe transfer, no ownership check, and no trace beyond
-- the balance itself moving. Confirmed exploitable against a real Postgres instance
-- before this migration existed. Lock both functions down to service_role only.

revoke execute on function public.reserve_withdrawal(uuid, numeric) from public;
revoke execute on function public.release_withdrawal_reservation(uuid, numeric) from public;

grant execute on function public.reserve_withdrawal(uuid, numeric) to service_role;
grant execute on function public.release_withdrawal_reservation(uuid, numeric) to service_role;

import "server-only";

import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

/**
 * Hard stop against accidentally taking real money. The build spec is explicit:
 * "Stripe live keys are a hard stop... treat switching to live keys as a decision for
 * the user to make explicitly, not something to do automatically." This throws unless
 * the configured secret key is a recognizable Stripe *test*-mode key, or an operator
 * has explicitly opted in via ALLOW_STRIPE_LIVE_MODE=true (a decision this app never
 * makes on its own).
 */
export function assertStripeTestMode() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return; // no key configured — callers handle that separately (unconfigured, not live).
  const isTestKey = key.startsWith("sk_test_") || key.startsWith("rk_test_");
  const liveModeExplicitlyAllowed = process.env.ALLOW_STRIPE_LIVE_MODE === "true";

  if (!isTestKey && !liveModeExplicitlyAllowed) {
    throw new Error(
      "Refusing to call Stripe with what looks like a live-mode key. HireUp only operates in Stripe test mode " +
        "by default — set ALLOW_STRIPE_LIVE_MODE=true only after an explicit, separate decision to go live."
    );
  }
}

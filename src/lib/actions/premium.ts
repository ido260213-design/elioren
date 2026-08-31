"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getStripeClient, assertStripeTestMode } from "@/lib/stripe";
import { PREMIUM_MONTHLY_PRICE_USD } from "@/lib/premium";

export type PremiumActionState = { error?: string } | undefined;

export async function startPremiumCheckout(): Promise<PremiumActionState> {
  const { user } = await requireUser();

  let stripe;
  try {
    assertStripeTestMode();
    stripe = getStripeClient();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Stripe is not safely configured." };
  }

  if (!stripe) {
    return { error: "Payments aren't configured yet — set STRIPE_SECRET_KEY." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let sessionUrl: string | null;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "HireUp Premium" },
            unit_amount: Math.round(PREMIUM_MONTHLY_PRICE_USD * 100),
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id } },
      metadata: { kind: "premium_subscription", user_id: user.id },
      success_url: `${siteUrl}/premium?subscribed=1`,
      cancel_url: `${siteUrl}/premium`,
    }, { idempotencyKey: `premium-checkout:${user.id}` });
    sessionUrl = session.url;
  } catch (err) {
    console.error("Stripe checkout session creation failed", err);
    return { error: "Couldn't start checkout — try again shortly." };
  }

  if (!sessionUrl) {
    return { error: "Couldn't start checkout — try again." };
  }

  redirect(sessionUrl);
}

export async function openBillingPortal(): Promise<PremiumActionState> {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!subscription) {
    return { error: "No subscription found." };
  }

  let stripe;
  try {
    assertStripeTestMode();
    stripe = getStripeClient();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Stripe is not safely configured." };
  }

  if (!stripe) {
    return { error: "Payments aren't configured yet — set STRIPE_SECRET_KEY." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let portalUrl: string;
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${siteUrl}/premium`,
    });
    portalUrl = portalSession.url;
  } catch (err) {
    console.error("Stripe billing portal session creation failed", err);
    return { error: "Couldn't open billing management — try again shortly." };
  }

  redirect(portalUrl);
}

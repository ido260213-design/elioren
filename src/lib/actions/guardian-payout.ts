"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { getStripeClient, assertStripeTestMode } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

export type LinkGuardianPayoutState = { error?: string; success?: boolean } | undefined;

const emailSchema = z.email();

/**
 * Kicks off linking a teen's earnings to their guardian's Stripe account. Stripe
 * Connect payouts generally require the account holder to be an adult, so — per the
 * build spec — a minor can't hold a Connect account directly; this creates an Express
 * account *for the guardian* and emails them a Stripe-hosted onboarding link. Nothing
 * is payable until the guardian finishes that onboarding and Stripe's account.updated
 * webhook confirms payouts_enabled (see src/app/api/webhooks/stripe/route.ts) —
 * enforced in the DB (prevent_payout_enabled_tamper) as well as here.
 */
export async function linkGuardianPayoutAccount(
  _prevState: LinkGuardianPayoutState,
  formData: FormData
): Promise<LinkGuardianPayoutState> {
  const { user } = await requireRole(["teen"]);

  const parsed = emailSchema.safeParse(formData.get("guardianEmail"));
  if (!parsed.success) {
    return { error: "Enter a valid guardian email address." };
  }
  const guardianEmail = parsed.data;

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

  const supabase = await createClient();

  try {
    const account = await stripe.accounts.create({
      type: "express",
      email: guardianEmail,
      capabilities: { transfers: { requested: true } },
      business_type: "individual",
    });

    const { error } = await supabase.from("guardian_payout_accounts").insert({
      teen_id: user.id,
      guardian_email: guardianEmail,
      stripe_connect_account_id: account.id,
    });

    if (error) {
      return { error: "You already have a guardian payout account linked." };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${siteUrl}/earnings`,
      return_url: `${siteUrl}/earnings?guardian_onboarded=1`,
      type: "account_onboarding",
    });

    await sendEmail({
      to: guardianEmail,
      subject: "Set up payouts for your teen's HireUp earnings",
      html: `<p>Your teen linked you as their payout guardian on HireUp. Finish setup so their earnings can be paid out to you:</p>
             <p><a href="${accountLink.url}">Complete Stripe onboarding</a></p>`,
    });
  } catch (err) {
    console.error("Stripe guardian account creation failed", err);
    return { error: "Couldn't start guardian payout setup — try again shortly." };
  }

  revalidatePath("/earnings");
  return { success: true };
}

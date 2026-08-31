"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole, requireUser } from "@/lib/auth";
import { getStripeClient, assertStripeTestMode } from "@/lib/stripe";

export type PaymentActionState = { error?: string } | undefined;

/**
 * Employer funds escrow for an accepted application. Gated on the employer having
 * passed the admin manual-review verification gate — this is the enforcement point for
 * the acceptance criterion "no job can be marked paid without passing through the admin
 * manual-review gate": an unverified employer can post and manage jobs, but can't move
 * real money until an admin has approved their verification_requests row.
 */
export async function fundJobEscrow(applicationId: string, _prevState: PaymentActionState, _formData: FormData): Promise<PaymentActionState> {
  const { user } = await requireRole(["employer", "business"]);
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, job_id, teen_id, status")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application || application.status !== "accepted") {
    return { error: "Only an accepted application can be funded." };
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, employer_id, pay_amount")
    .eq("id", application.job_id)
    .single();

  if (!job || job.employer_id !== user.id) {
    return { error: "You don't own this job." };
  }

  const { data: employerProfile } = await supabase
    .from("employer_profiles")
    .select("verification_status")
    .eq("user_id", user.id)
    .single();

  if (employerProfile?.verification_status !== "verified") {
    return {
      error: "Your account needs to pass admin verification before you can fund a job. Request verification from your profile.",
    };
  }

  const { data: existingHold } = await supabase
    .from("transactions")
    .select("id")
    .eq("job_id", job.id)
    .eq("teen_id", application.teen_id)
    .eq("type", "hold")
    .maybeSingle();

  if (existingHold) {
    return { error: "This job is already funded." };
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

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `HireUp escrow — ${job.title}` },
          unit_amount: Math.round(job.pay_amount * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      kind: "job_escrow_hold",
      application_id: application.id,
      job_id: job.id,
      employer_id: user.id,
      teen_id: application.teen_id,
    },
    success_url: `${siteUrl}/jobs/${job.id}?funded=1`,
    cancel_url: `${siteUrl}/jobs/${job.id}`,
  });

  if (!session.url) {
    return { error: "Couldn't start checkout — try again." };
  }

  redirect(session.url);
}

/**
 * Moves a succeeded escrow hold to the teen's available balance once the job is
 * marked filled. This is internal bookkeeping (the platform already holds the funds
 * from the initial charge — see fundJobEscrow), not a second Stripe charge; it's
 * exactly the "release" leg of a separate-charges-and-transfers escrow pattern. Uses
 * the service-role client because transactions/earnings_balance intentionally have no
 * authenticated-role write policy (see the payments migration).
 */
export async function releaseEscrowPayment(applicationId: string) {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, job_id, teen_id, status")
    .eq("id", applicationId)
    .single();

  if (!application) return;

  const { data: job } = await supabase.from("jobs").select("employer_id, status").eq("id", application.job_id).single();
  if (!job || job.employer_id !== user.id || job.status !== "filled") return;

  const admin = createAdminClient();

  const { data: hold } = await admin
    .from("transactions")
    .select("id, amount")
    .eq("job_id", application.job_id)
    .eq("teen_id", application.teen_id)
    .eq("type", "hold")
    .eq("status", "succeeded")
    .maybeSingle();

  if (!hold) return;

  const { data: existingRelease } = await admin
    .from("transactions")
    .select("id")
    .eq("job_id", application.job_id)
    .eq("teen_id", application.teen_id)
    .eq("type", "release")
    .maybeSingle();

  if (existingRelease) return; // already released

  await admin.from("transactions").insert({
    job_id: application.job_id,
    employer_id: job.employer_id,
    teen_id: application.teen_id,
    amount: hold.amount,
    type: "release",
    status: "succeeded",
  });

  const { data: balance } = await admin
    .from("earnings_balance")
    .select("available_balance, pending_balance")
    .eq("teen_id", application.teen_id)
    .maybeSingle();

  if (balance) {
    await admin
      .from("earnings_balance")
      .update({
        available_balance: Number(balance.available_balance) + Number(hold.amount),
        pending_balance: Math.max(0, Number(balance.pending_balance) - Number(hold.amount)),
      })
      .eq("teen_id", application.teen_id);
  } else {
    await admin.from("earnings_balance").insert({ teen_id: application.teen_id, available_balance: hold.amount });
  }

  revalidatePath("/earnings");
  revalidatePath(`/jobs/${application.job_id}`);
}

export type WithdrawState = { error?: string; success?: boolean } | undefined;

/**
 * Enforcement point for "a teen cannot withdraw funds without a confirmed guardian
 * payout link" — checked before any Stripe transfer is attempted, not just in the UI.
 */
export async function withdrawEarnings(_prevState: WithdrawState, formData: FormData): Promise<WithdrawState> {
  const { user } = await requireRole(["teen"]);
  const amount = Number(formData.get("amount"));

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount." };
  }

  const supabase = await createClient();

  const { data: guardianAccount } = await supabase
    .from("guardian_payout_accounts")
    .select("stripe_connect_account_id, payouts_enabled")
    .eq("teen_id", user.id)
    .maybeSingle();

  if (!guardianAccount || !guardianAccount.payouts_enabled) {
    return { error: "Link and confirm a parent/guardian payout account before withdrawing." };
  }

  const { data: balance } = await supabase
    .from("earnings_balance")
    .select("available_balance")
    .eq("teen_id", user.id)
    .maybeSingle();

  if (!balance || Number(balance.available_balance) < amount) {
    return { error: "You don't have that much available to withdraw." };
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

  const admin = createAdminClient();

  // Atomically reserve the funds first — this (not the `balance` read above, which is
  // only a friendly pre-check) is the real guard against two concurrent withdrawals
  // both passing against the same stale balance and both getting a real Stripe
  // transfer. See reserve_withdrawal() in the payments migration.
  const { data: reserved, error: reserveError } = await admin.rpc("reserve_withdrawal", {
    p_teen_id: user.id,
    p_amount: amount,
  });

  if (reserveError || !reserved) {
    return { error: "You don't have that much available to withdraw." };
  }

  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      destination: guardianAccount.stripe_connect_account_id,
    });

    await admin.from("transactions").insert({
      employer_id: null, // a payout has no employer party
      teen_id: user.id,
      amount,
      type: "payout",
      status: "succeeded",
      stripe_transfer_id: transfer.id,
    });
  } catch (err) {
    console.error("Stripe transfer failed", err);
    await admin.rpc("release_withdrawal_reservation", { p_teen_id: user.id, p_amount: amount });
    return { error: "The withdrawal couldn't be completed — try again shortly." };
  }

  revalidatePath("/earnings");
  return { success: true };
}

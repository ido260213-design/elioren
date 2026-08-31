import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { getStripeClient } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe webhook endpoint. Verifies the signature before trusting anything in the
// payload — never process an unverified event. Uses the service-role client
// throughout: transactions/earnings_balance/guardian_payout_accounts.payouts_enabled
// intentionally have no authenticated-role write policy (see the Phase 3 migrations),
// this handler is the (only, besides the release/withdraw server actions) place those
// get written.
export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhooks aren't configured" }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? "", webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // Both checkout flows restrict payment_method_types to ["card"], which settles
      // synchronously — "completed" always implies "paid" for us today. Still worth
      // checking explicitly: a bank-debit or other async method added later would fire
      // "completed" before the payment actually clears, and this guards against ever
      // crediting escrow for a session that didn't really get paid.
      if (session.metadata?.kind === "job_escrow_hold" && session.payment_status === "paid") {
        const { job_id, employer_id, teen_id } = session.metadata;
        const amount = (session.amount_total ?? 0) / 100;

        // Stripe delivers webhooks at-least-once and will retry this same event (e.g.
        // on a slow/ambiguous ack), so guard against double-crediting: skip if a hold
        // already exists for this job/teen (same natural key fundJobEscrow itself
        // checks before creating the Checkout Session).
        const { data: existingHold } = await admin
          .from("transactions")
          .select("id")
          .eq("job_id", job_id)
          .eq("teen_id", teen_id)
          .eq("type", "hold")
          .maybeSingle();

        if (existingHold) {
          break;
        }

        await admin.from("transactions").insert({
          job_id,
          employer_id,
          teen_id,
          amount,
          type: "hold",
          status: "succeeded",
          stripe_payment_intent_id:
            typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        });

        const { data: balance } = await admin
          .from("earnings_balance")
          .select("pending_balance")
          .eq("teen_id", teen_id)
          .maybeSingle();

        if (balance) {
          await admin
            .from("earnings_balance")
            .update({ pending_balance: Number(balance.pending_balance) + amount })
            .eq("teen_id", teen_id);
        } else {
          await admin.from("earnings_balance").insert({ teen_id, pending_balance: amount });
        }
      } else if (session.metadata?.kind === "premium_subscription") {
        // Handled by customer.subscription.created/updated below once Stripe finishes
        // provisioning the subscription — checkout completing just confirms payment.
      }
      break;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      if (account.charges_enabled && account.payouts_enabled) {
        await admin
          .from("guardian_payout_accounts")
          .update({ payouts_enabled: true })
          .eq("stripe_connect_account_id", account.id);
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      if (userId) {
        await admin.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id:
              typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
            stripe_subscription_id: subscription.id,
            status: mapStripeSubscriptionStatus(subscription.status),
            current_period_end: new Date(subscription.items.data[0]?.current_period_end * 1000).toISOString(),
          },
          { onConflict: "user_id" }
        );
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await admin
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): "active" | "past_due" | "canceled" | "incomplete" {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled") return "canceled";
  return "incomplete";
}

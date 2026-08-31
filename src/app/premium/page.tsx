import type { Metadata } from "next";
import { Check, Crown } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PREMIUM_MONTHLY_PRICE_USD, FREE_APPLICATIONS_PER_MONTH, FREE_ACTIVE_JOB_POSTS } from "@/lib/premium";
import { CheckoutButton, ManageBillingButton } from "./checkout-button";

export const metadata: Metadata = { title: "HireUp Premium" };

const TEEN_BENEFITS = [`Unlimited job applications (free accounts get ${FREE_APPLICATIONS_PER_MONTH}/month)`];

const EMPLOYER_BENEFITS = [
  `Unlimited active job posts (free accounts get ${FREE_ACTIVE_JOB_POSTS} at a time)`,
  "Priority visibility — your listings rank higher in Browse jobs",
];

export default async function PremiumPage() {
  const { user, profile } = await requireUser();
  const supabase = await createClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const isActive = subscription?.status === "active";
  const benefits = profile.role === "teen" ? TEEN_BENEFITS : EMPLOYER_BENEFITS;

  return (
    <DashboardShell role={profile.role} email={profile.email}>
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="size-6 text-amber-500" />
              <CardTitle className="text-xl">HireUp Premium</CardTitle>
              {isActive && <Badge variant="success">Active</Badge>}
            </div>
            <CardDescription>${PREMIUM_MONTHLY_PRICE_USD}/month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {b}
                </li>
              ))}
            </ul>

            {isActive ? (
              <div className="space-y-2">
                {subscription?.current_period_end && (
                  <p className="text-sm text-muted-foreground">
                    Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
                <ManageBillingButton />
              </div>
            ) : (
              <CheckoutButton />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

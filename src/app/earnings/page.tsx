import type { Metadata } from "next";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WithdrawForm } from "./withdraw-form";
import { LinkGuardianForm } from "./link-guardian-form";

export const metadata: Metadata = { title: "Earnings" };

export default async function EarningsPage() {
  const { user, profile } = await requireRole(["teen"]);
  const supabase = await createClient();

  const { data: balance } = await supabase
    .from("earnings_balance")
    .select("available_balance, pending_balance")
    .eq("teen_id", user.id)
    .maybeSingle();

  const { data: guardianAccount } = await supabase
    .from("guardian_payout_accounts")
    .select("guardian_email, payouts_enabled")
    .eq("teen_id", user.id)
    .maybeSingle();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, amount, type, status, created_at")
    .eq("teen_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  return (
    <DashboardShell role={profile.role} email={profile.email}>
      <h1 className="mb-6 text-2xl font-bold">Earnings</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm text-muted-foreground">Available</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {currency.format(Number(balance?.available_balance ?? 0))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm text-muted-foreground">Pending (in escrow)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {currency.format(Number(balance?.pending_balance ?? 0))}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Guardian payout account</CardTitle>
          <CardDescription>
            Stripe requires the account holder to be an adult, so payouts route through your
            parent/guardian&apos;s Stripe account. Required before your first withdrawal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {guardianAccount ? (
            <div className="flex items-center gap-2">
              <span className="text-sm">{guardianAccount.guardian_email}</span>
              <Badge variant={guardianAccount.payouts_enabled ? "success" : "outline"}>
                {guardianAccount.payouts_enabled ? "Confirmed" : "Pending guardian setup"}
              </Badge>
            </div>
          ) : (
            <LinkGuardianForm />
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Withdraw</CardTitle>
        </CardHeader>
        <CardContent>
          {guardianAccount?.payouts_enabled ? (
            <WithdrawForm availableBalance={Number(balance?.available_balance ?? 0)} />
          ) : (
            <p className="text-sm text-muted-foreground">Link and confirm a guardian payout account first.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction history</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions?.length ? (
            <div className="space-y-2">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{t.type}</span>
                  <span>{currency.format(Number(t.amount))}</span>
                  <Badge variant={t.status === "succeeded" ? "success" : "outline"}>{t.status}</Badge>
                  <span className="text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

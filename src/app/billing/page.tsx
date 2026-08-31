import type { Metadata } from "next";
import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const { user, profile } = await requireRole(["employer", "business"]);
  const supabase = await createClient();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, job_id, teen_id, amount, type, status, created_at")
    .eq("employer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const jobIds = [...new Set((transactions ?? []).map((t) => t.job_id).filter((id): id is string => id !== null))];
  const { data: jobs } = jobIds.length ? await supabase.from("jobs").select("id, title").in("id", jobIds) : { data: [] };
  const jobsById = new Map((jobs ?? []).map((j) => [j.id, j]));

  const teenIds = [...new Set((transactions ?? []).map((t) => t.teen_id))];
  const { data: teens } = teenIds.length
    ? await supabase.from("teen_profiles").select("user_id, full_name").in("user_id", teenIds)
    : { data: [] };
  const teensById = new Map((teens ?? []).map((t) => [t.user_id, t]));

  const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const totalFunded = (transactions ?? [])
    .filter((t) => t.type === "hold" && t.status === "succeeded")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <DashboardShell role={profile.role} email={profile.email}>
      <h1 className="mb-6 text-2xl font-bold">Billing</h1>

      <Card className="mb-6">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm text-muted-foreground">Total funded to escrow</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold">{currency.format(totalFunded)}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction history</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions?.length ? (
            <div className="space-y-2">
              {transactions.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <span className="capitalize font-medium">{t.type}</span>
                    {t.job_id && (
                      <>
                        {" · "}
                        <Link href={`/jobs/${t.job_id}`} className="hover:underline">
                          {jobsById.get(t.job_id)?.title ?? "Job"}
                        </Link>
                      </>
                    )}
                    {" · "}
                    <span className="text-muted-foreground">{teensById.get(t.teen_id)?.full_name ?? "Teen"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{currency.format(Number(t.amount))}</span>
                    <Badge variant={t.status === "succeeded" ? "success" : "outline"}>{t.status}</Badge>
                    <span className="text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
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

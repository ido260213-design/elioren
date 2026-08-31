import type { Metadata } from "next";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportActions } from "./report-actions";

export const metadata: Metadata = { title: "Reports queue" };

export default async function AdminReportsPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("reports")
    .select("id, reporter_id, target_type, target_id, reason, status, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: true });

  const reporterIds = [...new Set((reports ?? []).map((r) => r.reporter_id))];
  const { data: reporters } = reporterIds.length
    ? await supabase.from("profiles").select("id, email").in("id", reporterIds)
    : { data: [] };
  const reportersById = new Map((reporters ?? []).map((r) => [r.id, r]));

  const jobIds = (reports ?? []).filter((r) => r.target_type === "job").map((r) => r.target_id);
  const { data: jobs } = jobIds.length ? await supabase.from("jobs").select("id, title").in("id", jobIds) : { data: [] };
  const jobsById = new Map((jobs ?? []).map((j) => [j.id, j]));

  const profileTargetIds = (reports ?? []).filter((r) => r.target_type === "profile").map((r) => r.target_id);
  const { data: targetProfiles } = profileTargetIds.length
    ? await supabase.from("profiles").select("id, email, role").in("id", profileTargetIds)
    : { data: [] };
  const targetProfilesById = new Map((targetProfiles ?? []).map((p) => [p.id, p]));

  return (
    <AdminShell>
      <h1 className="mb-6 text-2xl font-bold">Reports queue</h1>
      {reports?.length ? (
        <div className="space-y-3">
          {reports.map((report) => {
            const reporter = reportersById.get(report.reporter_id);
            const targetLabel =
              report.target_type === "job"
                ? jobsById.get(report.target_id)?.title ?? "Job"
                : report.target_type === "profile"
                  ? targetProfilesById.get(report.target_id)?.email ?? "User profile"
                  : "Message";

            return (
              <Card key={report.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <div>
                    <p className="font-medium">
                      <Badge variant="outline" className="mr-2">
                        {report.target_type}
                      </Badge>
                      {targetLabel}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Reported by {reporter?.email ?? "unknown"} — {report.reason}
                    </p>
                  </div>
                  <ReportActions
                    reportId={report.id}
                    reporterId={report.reporter_id}
                    targetType={report.target_type}
                    targetId={report.target_id}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No open reports.</p>
      )}
    </AdminShell>
  );
}

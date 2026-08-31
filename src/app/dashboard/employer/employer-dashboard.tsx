import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EmployerAccountType, JobStatus } from "@/lib/supabase/database.types";

const STATUS_VARIANT: Record<JobStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  open: "success",
  filled: "secondary",
  closed: "outline",
};

export async function EmployerDashboard({ accountType }: { accountType: EmployerAccountType }) {
  const { user, profile } = await requireRole([accountType]);
  const supabase = await createClient();

  const { data: employerProfile } = await supabase
    .from("employer_profiles")
    .select("display_name, verification_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!employerProfile) {
    redirect(`/onboarding/${accountType}`);
  }

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, status, created_at")
    .eq("employer_id", user.id)
    .order("created_at", { ascending: false });

  // RLS already scopes this to applications on this employer's own jobs, so a plain
  // select (no WHERE) returns exactly the rows needed to tally per-job applicant counts.
  const { data: applicationRows } = await supabase.from("applications").select("job_id");
  const applicantCounts = new Map<string, number>();
  for (const row of applicationRows ?? []) {
    applicantCounts.set(row.job_id, (applicantCounts.get(row.job_id) ?? 0) + 1);
  }

  return (
    <DashboardShell role={profile.role} email={profile.email}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{employerProfile.display_name}</h1>
          <Badge variant={employerProfile.verification_status === "verified" ? "success" : "outline"} className="mt-1">
            {employerProfile.verification_status === "verified" ? "Verified" : "Unverified"}
          </Badge>
        </div>
        <Button asChild>
          <Link href="/jobs/new">Post a job</Link>
        </Button>
      </div>

      <h2 className="mb-4 text-lg font-semibold">Your job posts</h2>

      {jobs?.length ? (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="flex items-center justify-between py-2">
                <div>
                  <Link href={`/jobs/${job.id}`} className="font-medium hover:underline">
                    {job.title}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant={STATUS_VARIANT[job.status]}>{job.status}</Badge>
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" />
                      {applicantCounts.get(job.id) ?? 0} applicants
                    </span>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/applications?job=${job.id}`}>View applicants</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-normal text-muted-foreground">
              You haven&apos;t posted a job yet.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/jobs/new">Post your first job</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}

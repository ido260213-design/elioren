import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { GuardianPendingBanner } from "@/components/guardian-pending-banner";
import { JobCard } from "@/components/job-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Teen dashboard" };

export default async function TeenDashboardPage() {
  const { user, profile } = await requireRole(["teen"]);
  const supabase = await createClient();

  const { data: teenProfile } = await supabase
    .from("teen_profiles")
    .select("full_name, guardian_email, guardian_confirmed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!teenProfile) {
    redirect("/onboarding/teen");
  }

  const { data: applications } = await supabase
    .from("applications")
    .select("status")
    .eq("teen_id", user.id);

  const counts = {
    applied: applications?.filter((a) => a.status === "applied").length ?? 0,
    interview: applications?.filter((a) => a.status === "interview").length ?? 0,
    accepted: applications?.filter((a) => a.status === "accepted").length ?? 0,
  };

  const { data: recentJobs } = await supabase
    .from("jobs")
    .select("id, title, category, location_text, pay_type, pay_amount, age_min, age_max, workers_needed, status")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <DashboardShell role={profile.role} email={profile.email}>
      {!teenProfile.guardian_confirmed_at && (
        <GuardianPendingBanner guardianEmail={teenProfile.guardian_email} />
      )}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hi, {teenProfile.full_name.split(" ")[0]}</h1>
        <Button asChild>
          <Link href="/jobs">Browse jobs</Link>
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm text-muted-foreground">Applied</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{counts.applied}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm text-muted-foreground">Interviewing</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{counts.interview}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm text-muted-foreground">Accepted</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{counts.accepted}</CardContent>
        </Card>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">New jobs nearby</h2>
        <Link href="/jobs" className="text-sm text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recentJobs?.length ? (
          recentJobs.map((job) => <JobCard key={job.id} job={job} />)
        ) : (
          <p className="text-sm text-muted-foreground">No open jobs yet — check back soon.</p>
        )}
      </div>
    </DashboardShell>
  );
}

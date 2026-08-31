import type { Metadata } from "next";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrComputeMatchScore } from "@/lib/match-score";
import { DashboardShell } from "@/components/dashboard-shell";
import { JobCard } from "@/components/job-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WorkPassportTool } from "./work-passport-tool";
import { InterviewPrepTool } from "./interview-prep-tool";

export const metadata: Metadata = { title: "AI Assistant" };

const RECOMMENDATION_POOL_SIZE = 15;
const RECOMMENDATION_COUNT = 5;

export default async function AssistantPage() {
  const { user, profile } = await requireRole(["teen"]);
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, category, location_text, pay_type, pay_amount, age_min, age_max, workers_needed, status, description, updated_at, employer_id")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(RECOMMENDATION_POOL_SIZE);

  const scored = await Promise.all(
    (jobs ?? []).map(async (job) => ({ job, ...(await getOrComputeMatchScore(supabase, user.id, job)) }))
  );
  const recommended = scored.sort((a, b) => b.score - a.score).slice(0, RECOMMENDATION_COUNT);

  const employerIds = [...new Set(recommended.map((r) => r.job.employer_id))];
  const { data: employers } = employerIds.length
    ? await supabase.from("employer_profiles").select("user_id, display_name, verification_status").in("user_id", employerIds)
    : { data: [] };
  const employersById = new Map((employers ?? []).map((e) => [e.user_id, e]));

  const { data: applications } = await supabase.from("applications").select("job_id").eq("teen_id", user.id);
  const appliedJobIds = (applications ?? []).map((a) => a.job_id);
  const { data: appliedJobs } = appliedJobIds.length
    ? await supabase.from("jobs").select("id, title").in("id", appliedJobIds)
    : { data: [] };

  return (
    <DashboardShell role={profile.role} email={profile.email}>
      <h1 className="mb-6 text-2xl font-bold">AI Assistant</h1>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommended for you</CardTitle>
            <CardDescription>Open jobs ranked by your AI match score.</CardDescription>
          </CardHeader>
          <CardContent>
            {recommended.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recommended.map(({ job, score }) => {
                  const employer = employersById.get(job.employer_id);
                  return (
                    <JobCard
                      key={job.id}
                      job={{
                        ...job,
                        employer_display_name: employer?.display_name,
                        employer_verification_status: employer?.verification_status,
                      }}
                      matchScore={score}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No open jobs to recommend yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkPassportTool />
        <InterviewPrepTool jobs={appliedJobs ?? []} />
      </div>
    </DashboardShell>
  );
}

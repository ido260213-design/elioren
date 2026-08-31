import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { ApplicationStatusBadge } from "@/components/application-status-badge";
import { RateParticipantDialog } from "@/components/rate-participant-dialog";
import { ReportButton } from "@/components/report-button";
import { MessageButton } from "@/components/message-button";
import { Card, CardContent } from "@/components/ui/card";
import { ApplicationStatusSelect } from "./application-status-select";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const { job: jobFilter } = await searchParams;
  const { user, profile } = await requireUser();
  const supabase = await createClient();

  if (profile.role === "teen") {
    const { data: applications } = await supabase
      .from("applications")
      .select("id, status, applied_at, job_id")
      .eq("teen_id", user.id)
      .order("applied_at", { ascending: false });

    const jobIds = [...new Set((applications ?? []).map((a) => a.job_id))];
    const { data: jobs } = jobIds.length
      ? await supabase.from("jobs").select("id, title, employer_id, status").in("id", jobIds)
      : { data: [] };
    const jobsById = new Map((jobs ?? []).map((j) => [j.id, j]));

    const employerIds = [...new Set((jobs ?? []).map((j) => j.employer_id))];
    const { data: employers } = employerIds.length
      ? await supabase.from("employer_profiles").select("user_id, display_name").in("user_id", employerIds)
      : { data: [] };
    const employersById = new Map((employers ?? []).map((e) => [e.user_id, e]));

    const { data: myRatings } = await supabase.from("ratings").select("job_id").eq("rater_id", user.id);
    const ratedJobIds = new Set((myRatings ?? []).map((r) => r.job_id));

    return (
      <DashboardShell role={profile.role} email={profile.email}>
        <h1 className="mb-6 text-2xl font-bold">My applications</h1>
        {applications?.length ? (
          <div className="space-y-3">
            {applications.map((application) => {
              const job = jobsById.get(application.job_id);
              const employer = job ? employersById.get(job.employer_id) : undefined;
              const canRate = job?.status === "filled" && application.status === "accepted";

              return (
                <Card key={application.id}>
                  <CardContent className="flex items-center justify-between gap-4 py-2">
                    <div>
                      <Link href={`/jobs/${application.job_id}`} className="font-medium hover:underline">
                        {job?.title ?? "Job"}
                      </Link>
                      <p className="text-sm text-muted-foreground">{employer?.display_name ?? "HireUp employer"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {canRate && job && (
                        <RateParticipantDialog
                          jobId={job.id}
                          rateeId={job.employer_id}
                          rateeName={employer?.display_name ?? "the employer"}
                          alreadyRated={ratedJobIds.has(job.id)}
                        />
                      )}
                      <MessageButton applicationId={application.id} />
                      <ApplicationStatusBadge status={application.status} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t applied to any jobs yet.{" "}
            <Link href="/jobs" className="text-primary hover:underline">
              Browse jobs
            </Link>
          </p>
        )}
      </DashboardShell>
    );
  }

  // employer / business view
  let jobsQuery = supabase.from("jobs").select("id, title, status").eq("employer_id", user.id);
  if (jobFilter) jobsQuery = jobsQuery.eq("id", jobFilter);
  const { data: myJobs } = await jobsQuery.order("created_at", { ascending: false });

  const myJobIds = (myJobs ?? []).map((j) => j.id);
  const { data: applications } = myJobIds.length
    ? await supabase
        .from("applications")
        .select("id, status, applied_at, job_id, teen_id")
        .in("job_id", myJobIds)
        .order("applied_at", { ascending: false })
    : { data: [] };

  const teenIds = [...new Set((applications ?? []).map((a) => a.teen_id))];
  const { data: teens } = teenIds.length
    ? await supabase.from("teen_profiles").select("user_id, full_name, skills").in("user_id", teenIds)
    : { data: [] };
  const teensById = new Map((teens ?? []).map((t) => [t.user_id, t]));
  const jobsById = new Map((myJobs ?? []).map((j) => [j.id, j]));

  const { data: myRatings } = await supabase.from("ratings").select("job_id, ratee_id").eq("rater_id", user.id);
  const ratedPairs = new Set((myRatings ?? []).map((r) => `${r.job_id}:${r.ratee_id}`));

  return (
    <DashboardShell role={profile.role} email={profile.email}>
      <h1 className="mb-6 text-2xl font-bold">Applicants</h1>
      {applications?.length ? (
        <div className="space-y-3">
          {applications.map((application) => {
            const teen = teensById.get(application.teen_id);
            const job = jobsById.get(application.job_id);
            const canRate = job?.status === "filled" && application.status === "accepted";

            return (
              <Card key={application.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <div>
                    <p className="font-medium">{teen?.full_name ?? "Applicant"}</p>
                    <p className="text-sm text-muted-foreground">
                      Applied to <Link href={`/jobs/${application.job_id}`} className="hover:underline">{job?.title}</Link>
                    </p>
                    {teen?.skills && teen.skills.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">{teen.skills.join(", ")}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {canRate && job && (
                      <RateParticipantDialog
                        jobId={job.id}
                        rateeId={application.teen_id}
                        rateeName={teen?.full_name ?? "this teen"}
                        alreadyRated={ratedPairs.has(`${job.id}:${application.teen_id}`)}
                      />
                    )}
                    <MessageButton applicationId={application.id} />
                    <ApplicationStatusSelect applicationId={application.id} status={application.status} />
                    <ReportButton targetType="profile" targetId={application.teen_id} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No applicants yet.</p>
      )}
    </DashboardShell>
  );
}

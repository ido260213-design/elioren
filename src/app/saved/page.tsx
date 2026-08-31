import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { JobCard } from "@/components/job-card";
import { SavedJobsFilter } from "./saved-jobs-filter";

export const metadata: Metadata = { title: "Saved jobs" };

export default async function SavedJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const { user, profile } = await requireRole(["teen"]);
  const supabase = await createClient();

  const { data: saved } = await supabase
    .from("saved_jobs")
    .select("job_id")
    .eq("teen_id", user.id)
    .order("created_at", { ascending: false });

  const jobIds = (saved ?? []).map((s) => s.job_id);

  let jobs: Array<{
    id: string;
    title: string;
    category: string;
    location_text: string;
    pay_type: "hourly" | "fixed";
    pay_amount: number;
    age_min: number;
    age_max: number;
    workers_needed: number;
    status: "open" | "filled" | "closed";
    employer_id: string;
  }> = [];

  if (jobIds.length) {
    let jobsQuery = supabase
      .from("jobs")
      .select("id, title, category, location_text, pay_type, pay_amount, age_min, age_max, workers_needed, status, employer_id")
      .in("id", jobIds);
    if (category) jobsQuery = jobsQuery.eq("category", category);
    const { data } = await jobsQuery;
    jobs = data ?? [];
  }

  const employerIds = [...new Set(jobs.map((j) => j.employer_id))];
  const { data: employers } = employerIds.length
    ? await supabase.from("employer_profiles").select("user_id, display_name, verification_status").in("user_id", employerIds)
    : { data: [] };
  const employersById = new Map((employers ?? []).map((e) => [e.user_id, e]));

  return (
    <DashboardShell role={profile.role} email={profile.email}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Saved jobs</h1>
        <Suspense>
          <SavedJobsFilter />
        </Suspense>
      </div>

      {jobs.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => {
            const employer = employersById.get(job.employer_id);
            return (
              <JobCard
                key={job.id}
                job={{ ...job, employer_display_name: employer?.display_name, employer_verification_status: employer?.verification_status }}
                saved
              />
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No saved jobs yet.{" "}
          <Link href="/jobs" className="text-primary hover:underline">
            Browse jobs
          </Link>{" "}
          and tap the bookmark icon to save one.
        </p>
      )}
    </DashboardShell>
  );
}

import type { Metadata } from "next";

import { PublicHeader } from "@/components/public-header";
import { JobFilterBar } from "@/components/job-filter-bar";
import { JobCard } from "@/components/job-card";
import { createClient } from "@/lib/supabase/server";
import { getOrComputeMatchScore } from "@/lib/match-score";

export const metadata: Metadata = { title: "Browse jobs" };

const PAGE_SIZE = 24;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("jobs")
    .select(
      "id, title, category, location_text, pay_type, pay_amount, age_min, age_max, workers_needed, status, description, updated_at, employer_id"
    )
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (category) {
    query = query.eq("category", category);
  }
  if (q) {
    query = query.or(`title.ilike.%${q}%,location_text.ilike.%${q}%`);
  }

  const { data: fetchedJobs } = await query;

  const employerIds = [...new Set((fetchedJobs ?? []).map((j) => j.employer_id))];
  const { data: employers } = employerIds.length
    ? await supabase.from("employer_profiles").select("user_id, display_name, verification_status").in("user_id", employerIds)
    : { data: [] };
  const employersById = new Map((employers ?? []).map((e) => [e.user_id, e]));

  const { data: premiumSubs } = employerIds.length
    ? await supabase.from("subscriptions").select("user_id").in("user_id", employerIds).eq("status", "active")
    : { data: [] };
  const premiumEmployerIds = new Set((premiumSubs ?? []).map((s) => s.user_id));

  // Priority-visibility boost for HireUp Premium employers: stable sort keeps
  // everything else in its existing (most-recent-first) order.
  const jobs = [...(fetchedJobs ?? [])].sort((a, b) => {
    const aPremium = premiumEmployerIds.has(a.employer_id) ? 1 : 0;
    const bPremium = premiumEmployerIds.has(b.employer_id) ? 1 : 0;
    return bPremium - aPremium;
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let savedJobIds = new Set<string>();
  let matchScores = new Map<string, number>();

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

    if (profile?.role === "teen") {
      const { data: saved } = await supabase.from("saved_jobs").select("job_id").eq("teen_id", user.id);
      savedJobIds = new Set((saved ?? []).map((s) => s.job_id));

      // Computing (or reading cached) match scores for every visible card trades page
      // load latency for satisfying "match scores appear on job listings" directly —
      // the job_matches cache keeps repeat visits fast. A production deployment with a
      // larger catalog would want to precompute these in the background instead.
      const results = await Promise.all(
        (jobs ?? []).map((job) => getOrComputeMatchScore(supabase, user.id, job))
      );
      matchScores = new Map((jobs ?? []).map((job, i) => [job.id, results[i].score]));
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Browse jobs</h1>
        <div className="mb-6">
          <JobFilterBar />
        </div>
        {jobs?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => {
              const employer = employersById.get(job.employer_id);
              return (
                <JobCard
                  key={job.id}
                  job={{
                    ...job,
                    employer_display_name: employer?.display_name,
                    employer_verification_status: employer?.verification_status,
                  }}
                  saved={user ? savedJobIds.has(job.id) : undefined}
                  matchScore={matchScores.get(job.id)}
                  employerIsPremium={premiumEmployerIds.has(job.employer_id)}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No jobs match your search yet.</p>
        )}
      </main>
    </div>
  );
}

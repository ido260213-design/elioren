import type { Metadata } from "next";

import { PublicHeader } from "@/components/public-header";
import { JobFilterBar } from "@/components/job-filter-bar";
import { JobCard } from "@/components/job-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Browse jobs" };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("jobs")
    .select("id, title, category, location_text, pay_type, pay_amount, age_min, age_max, workers_needed, status")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }
  if (q) {
    query = query.or(`title.ilike.%${q}%,location_text.ilike.%${q}%`);
  }

  const { data: jobs } = await query;

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
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No jobs match your search yet.</p>
        )}
      </main>
    </div>
  );
}

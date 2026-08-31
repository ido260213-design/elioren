import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin, Users, BadgeCheck } from "lucide-react";

import { PublicHeader } from "@/components/public-header";
import { Badge } from "@/components/ui/badge";
import { ReportButton } from "@/components/report-button";
import { SaveJobButton } from "@/components/save-job-button";
import { MatchScoreCard } from "@/components/match-score-card";
import { createClient } from "@/lib/supabase/server";
import { getOrComputeMatchScore } from "@/lib/match-score";
import { geocodeLocation } from "@/lib/geocode";
import { ApplyButton } from "./apply-button";
import { JobOwnerControls } from "./job-owner-controls";

function formatPay(payType: "hourly" | "fixed", amount: number) {
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  return payType === "hourly" ? `${money}/hr` : `${money} fixed`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("title").eq("id", id).maybeSingle();
  return { title: job?.title ?? "Job" };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();

  if (!job) notFound();

  // Fallback for jobs whose post-time geocode failed or ran with no Mapbox token
  // configured yet — geocode lazily on first view instead of leaving it permanently
  // un-mapped.
  if (job.lat === null || job.lng === null) {
    const coords = await geocodeLocation(job.location_text);
    if (coords) {
      job.lat = coords.lat;
      job.lng = coords.lng;
      await supabase.from("jobs").update({ lat: coords.lat, lng: coords.lng }).eq("id", job.id);
    }
  }

  const { data: employerProfile } = await supabase
    .from("employer_profiles")
    .select("display_name, verification_status")
    .eq("user_id", job.employer_id)
    .maybeSingle();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profileRole: string | null = null;
  let alreadyApplied = false;
  let alreadySaved = false;
  let match: { score: number; explanation: string } | null = null;

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    profileRole = profile?.role ?? null;

    if (profileRole === "teen") {
      const [{ data: existingApplication }, { data: existingSave }, matchResult] = await Promise.all([
        supabase.from("applications").select("id").eq("job_id", job.id).eq("teen_id", user.id).maybeSingle(),
        supabase.from("saved_jobs").select("job_id").eq("teen_id", user.id).eq("job_id", job.id).maybeSingle(),
        getOrComputeMatchScore(supabase, user.id, job),
      ]);
      alreadyApplied = Boolean(existingApplication);
      alreadySaved = Boolean(existingSave);
      match = matchResult;
    }
  }

  const isOwner = user?.id === job.employer_id;

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
              {employerProfile?.display_name ?? "HireUp employer"}
              {employerProfile?.verification_status === "verified" && (
                <BadgeCheck className="size-4 text-primary" aria-label="Verified" />
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Badge variant="secondary" className="text-base">
              {formatPay(job.pay_type, job.pay_amount)}
            </Badge>
            {profileRole === "teen" && <SaveJobButton jobId={job.id} saved={alreadySaved} />}
          </div>
        </div>

        {match && <MatchScoreCard score={match.score} explanation={match.explanation} />}

        <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-4" />
            {job.location_text}
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-4" />
            {job.workers_needed} worker{job.workers_needed > 1 ? "s" : ""} needed
          </span>
          <span>
            Ages {job.age_min}–{job.age_max}
          </span>
          <Badge variant="outline">{job.category}</Badge>
          <Badge variant={job.status === "open" ? "success" : job.status === "filled" ? "secondary" : "outline"}>
            {job.status}
          </Badge>
        </div>

        <div className="prose prose-sm mb-8 max-w-none whitespace-pre-wrap text-foreground">{job.description}</div>

        <div className="flex flex-wrap items-center gap-3">
          {profileRole === "teen" && job.status === "open" && (
            <ApplyButton jobId={job.id} alreadyApplied={alreadyApplied} />
          )}
          {isOwner && <JobOwnerControls jobId={job.id} status={job.status} />}
          {user && !isOwner && <ReportButton targetType="job" targetId={job.id} />}
        </div>
      </main>
    </div>
  );
}

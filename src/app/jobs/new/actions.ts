"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { jobPostSchema } from "@/lib/validations/jobs";
import { geocodeLocation } from "@/lib/geocode";
import { screenContent } from "@/lib/moderation";
import { hasPremium, FREE_ACTIVE_JOB_POSTS } from "@/lib/premium";

export type JobPostState = { error?: string } | undefined;

export async function postJob(_prevState: JobPostState, formData: FormData): Promise<JobPostState> {
  const { user } = await requireRole(["employer", "business"]);

  const parsed = jobPostSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    locationText: formData.get("locationText"),
    payType: formData.get("payType"),
    payAmount: formData.get("payAmount"),
    ageMin: formData.get("ageMin"),
    ageMax: formData.get("ageMax"),
    workersNeeded: formData.get("workersNeeded"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const screening = screenContent(`${parsed.data.title} ${parsed.data.description}`);
  if (screening.blocked) {
    return { error: `This listing was blocked: it ${screening.reason}. Edit it and try again.` };
  }

  const supabase = await createClient();

  if (!(await hasPremium(supabase, user.id))) {
    const { count } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("employer_id", user.id)
      .eq("status", "open");

    if ((count ?? 0) >= FREE_ACTIVE_JOB_POSTS) {
      return {
        error: `Free accounts get ${FREE_ACTIVE_JOB_POSTS} active job posts at a time. Upgrade to HireUp Premium for unlimited posts, or close an existing one first.`,
      };
    }
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      employer_id: user.id,
      title: parsed.data.title,
      category: parsed.data.category,
      location_text: parsed.data.locationText,
      pay_type: parsed.data.payType,
      pay_amount: parsed.data.payAmount,
      age_min: parsed.data.ageMin,
      age_max: parsed.data.ageMax,
      workers_needed: parsed.data.workersNeeded,
      description: parsed.data.description,
    })
    .select("id")
    .single();

  if (error || !job) {
    return { error: error?.message ?? "Something went wrong posting your job." };
  }

  // Best-effort — a failed/missing geocode never blocks the post; the job just won't
  // show a map marker until it succeeds (retried on first detail-page view, see
  // src/app/jobs/[id]/page.tsx).
  const coords = await geocodeLocation(parsed.data.locationText);
  if (coords) {
    await supabase.from("jobs").update({ lat: coords.lat, lng: coords.lng }).eq("id", job.id);
  }

  redirect(`/jobs/${job.id}`);
}

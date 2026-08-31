"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { jobPostSchema } from "@/lib/validations/jobs";

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

  const supabase = await createClient();

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

  redirect(`/jobs/${job.id}`);
}

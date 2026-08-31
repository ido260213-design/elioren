"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireRole, requireUser } from "@/lib/auth";
import { hasPremium, FREE_APPLICATIONS_PER_MONTH } from "@/lib/premium";
import type { JobStatus } from "@/lib/supabase/database.types";

export type ApplyState = { error?: string; success?: boolean } | undefined;

export async function applyToJob(jobId: string, _prevState: ApplyState, _formData: FormData): Promise<ApplyState> {
  const { user } = await requireRole(["teen"]);
  const supabase = await createClient();

  if (!(await hasPremium(supabase, user.id))) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("teen_id", user.id)
      .gte("applied_at", startOfMonth.toISOString());

    if ((count ?? 0) >= FREE_APPLICATIONS_PER_MONTH) {
      return {
        error: `Free accounts get ${FREE_APPLICATIONS_PER_MONTH} applications a month. Upgrade to HireUp Premium for unlimited applications.`,
      };
    }
  }

  const { error } = await supabase.from("applications").insert({ job_id: jobId, teen_id: user.id });

  if (error) {
    if (error.code === "23505") {
      return { error: "You've already applied to this job." };
    }
    return { error: "Couldn't submit your application — try again." };
  }

  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

export async function updateJobStatus(jobId: string, status: JobStatus) {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId).eq("employer_id", user.id);

  if (!error) {
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/applications");
  }
}

"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function saveJob(jobId: string) {
  const { user } = await requireRole(["teen"]);
  const supabase = await createClient();
  await supabase.from("saved_jobs").insert({ teen_id: user.id, job_id: jobId });
  revalidatePath("/saved");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
}

export async function unsaveJob(jobId: string) {
  const { user } = await requireRole(["teen"]);
  const supabase = await createClient();
  await supabase.from("saved_jobs").delete().eq("teen_id", user.id).eq("job_id", jobId);
  revalidatePath("/saved");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
}

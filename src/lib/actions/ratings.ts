"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export type SubmitRatingState = { error?: string; success?: boolean } | undefined;

export async function submitRating(_prevState: SubmitRatingState, formData: FormData): Promise<SubmitRatingState> {
  const { user } = await requireUser();

  const jobId = formData.get("jobId") as string;
  const rateeId = formData.get("rateeId") as string;
  const stars = Number(formData.get("stars"));
  const review = (formData.get("review") as string | null)?.trim() || null;

  if (!jobId || !rateeId || !stars || stars < 1 || stars > 5) {
    return { error: "Pick a star rating before submitting." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("ratings").insert({
    job_id: jobId,
    rater_id: user.id,
    ratee_id: rateeId,
    stars,
    review,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You've already rated this job." };
    }
    return { error: "Couldn't submit your rating — make sure the job is marked complete." };
  }

  revalidatePath("/applications");
  return { success: true };
}

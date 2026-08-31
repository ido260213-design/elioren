"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export type RequestVerificationState = { error?: string; success?: boolean } | undefined;

export async function requestVerification(): Promise<RequestVerificationState> {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("verification_requests").insert({ user_id: user.id });

  if (error) {
    // The insert policy blocks a second pending request with an RLS violation
    // (code 42501), not a unique-constraint error — either way, this is the only
    // reason this insert can fail for an otherwise-eligible user.
    return { error: "You already have a pending verification request." };
  }

  revalidatePath("/profile");
  return { success: true };
}

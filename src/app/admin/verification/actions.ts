"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { VerificationRequestStatus } from "@/lib/supabase/database.types";

export async function reviewVerificationRequest(requestId: string, decision: VerificationRequestStatus) {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("verification_requests").update({ status: decision }).eq("id", requestId);

  if (!error) {
    revalidatePath("/admin/verification");
    revalidatePath("/admin");
  }
}

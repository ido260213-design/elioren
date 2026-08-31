"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { ApplicationStatus } from "@/lib/supabase/database.types";

export async function updateApplicationStatus(applicationId: string, status: ApplicationStatus) {
  await requireUser();
  const supabase = await createClient();

  // RLS (applications_update_by_employer) already restricts this to the employer who
  // owns the job the application belongs to — no extra ownership check needed here.
  const { error } = await supabase.from("applications").update({ status }).eq("id", applicationId);

  if (!error) {
    revalidatePath("/applications");
  }
}

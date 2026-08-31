"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { ReportTargetType } from "@/lib/supabase/database.types";

export type FileReportState = { error?: string; success?: boolean } | undefined;

export async function fileReport(_prevState: FileReportState, formData: FormData): Promise<FileReportState> {
  const { user } = await requireUser();

  const targetType = formData.get("targetType") as ReportTargetType;
  const targetId = formData.get("targetId") as string;
  const reason = (formData.get("reason") as string | null)?.trim();

  if (!targetType || !targetId || !reason) {
    return { error: "Tell us what's wrong before submitting." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason,
  });

  if (error) {
    return { error: "Couldn't submit your report — try again." };
  }

  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

async function updateReportStatus(reportId: string, status: "resolved" | "dismissed" | "reviewing") {
  const supabase = await createClient();
  await supabase.from("reports").update({ status }).eq("id", reportId);
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

export async function dismissReport(reportId: string) {
  await requireRole(["admin"]);
  await updateReportStatus(reportId, "dismissed");
}

/** Removes a reported job post (closes it) and resolves the report. */
export async function removeReportedJob(reportId: string, jobId: string) {
  await requireRole(["admin"]);
  const supabase = await createClient();
  await supabase.from("jobs").update({ status: "closed" }).eq("id", jobId);
  await updateReportStatus(reportId, "resolved");
}

/** Blocks the reported user on the reporter's behalf and resolves the report. */
export async function blockReportedUser(reportId: string, reporterId: string, targetUserId: string) {
  await requireRole(["admin"]);
  const supabase = await createClient();
  await supabase
    .from("blocked_users")
    .insert({ blocker_id: reporterId, blocked_id: targetUserId, reason: "Admin action on a report" });
  await updateReportStatus(reportId, "resolved");
}

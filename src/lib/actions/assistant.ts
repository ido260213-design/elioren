"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { getAnthropicClient, ASSISTANT_MODEL } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/rate-limit";

export type AssistantState = { error?: string; result?: string } | undefined;

async function callAssistant(userId: string, system: string, prompt: string): Promise<AssistantState> {
  if (!checkRateLimit(`assistant:${userId}`, 10, 60_000)) {
    return { error: "You're asking a lot of questions at once — try again in a minute." };
  }

  const anthropic = getAnthropicClient();
  if (!anthropic) {
    return { error: "The AI assistant isn't configured yet — set ANTHROPIC_API_KEY." };
  }

  try {
    const message = await anthropic.messages.create({
      model: ASSISTANT_MODEL,
      max_tokens: 600,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content.find((b) => b.type === "text")?.text ?? "";
    return { result: text };
  } catch (error) {
    console.error("Anthropic assistant call failed", error);
    return { error: "The AI assistant hit a snag — try again shortly." };
  }
}

export async function generateWorkPassportDraft(): Promise<AssistantState> {
  const { user } = await requireRole(["teen"]);
  const supabase = await createClient();

  const { data: teenProfile } = await supabase
    .from("teen_profiles")
    .select("full_name, skills, hobbies, bio")
    .eq("user_id", user.id)
    .single();

  if (!teenProfile) return { error: "Complete your profile first." };

  const { data: acceptedApplications } = await supabase
    .from("applications")
    .select("job_id")
    .eq("teen_id", user.id)
    .eq("status", "accepted");

  const jobIds = (acceptedApplications ?? []).map((a) => a.job_id);
  const { data: completedJobs } = jobIds.length
    ? await supabase.from("jobs").select("id, title, category, status").in("id", jobIds).eq("status", "filled")
    : { data: [] };

  const { data: ratingsReceived } = await supabase
    .from("ratings")
    .select("stars, review")
    .eq("ratee_id", user.id);

  const prompt = `Teen: ${teenProfile.full_name}
Skills: ${teenProfile.skills.join(", ") || "none listed"}
Hobbies: ${teenProfile.hobbies.join(", ") || "none listed"}
Bio: ${teenProfile.bio ?? "none"}
Completed jobs: ${(completedJobs ?? []).map((j) => `${j.title} (${j.category})`).join("; ") || "none yet"}
Ratings received: ${(ratingsReceived ?? []).map((r) => `${r.stars}/5${r.review ? ` — "${r.review}"` : ""}`).join("; ") || "none yet"}`;

  return callAssistant(
    user.id,
    "You write a short, first-draft 'Work Passport' for a teen (13-18) using HireUp, a part-time job marketplace. " +
      "This is a first draft only, not a final record — write 3-4 short paragraphs (or bullet points) covering: " +
      "who they are, skills/strengths, work experience so far, and what kind of work they're a good fit for. " +
      "Keep it encouraging, age-appropriate, and honest — don't invent experience they don't have. Plain text, no markdown headers.",
    prompt
  );
}

export async function generateInterviewPrep(jobId: string): Promise<AssistantState> {
  const { user } = await requireRole(["teen"]);
  const supabase = await createClient();

  const { data: job } = await supabase.from("jobs").select("title, category, description").eq("id", jobId).maybeSingle();
  if (!job) return { error: "Job not found." };

  const { data: teenProfile } = await supabase
    .from("teen_profiles")
    .select("skills, hobbies, bio")
    .eq("user_id", user.id)
    .single();

  const prompt = `Job: ${job.title} (${job.category})
Description: ${job.description}

Teen's skills: ${teenProfile?.skills.join(", ") || "none listed"}
Teen's hobbies: ${teenProfile?.hobbies.join(", ") || "none listed"}
Teen's bio: ${teenProfile?.bio ?? "none"}`;

  return callAssistant(
    user.id,
    "You give a teen (13-18) short, practical interview-prep tips for a specific part-time/one-time job on HireUp. " +
      "Give 4-5 bullet points: likely questions they might get asked, how to talk about their (possibly limited) " +
      "experience honestly and confidently, and one tip specific to this job. Keep it encouraging and concrete, plain text.",
    prompt
  );
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getAnthropicClient, MATCH_SCORE_MODEL } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Database } from "@/lib/supabase/database.types";

interface JobForMatch {
  id: string;
  title: string;
  category: string;
  description: string;
  updated_at: string;
}

interface MatchResult {
  score: number;
  explanation: string;
  fromCache: boolean;
}

function heuristicFallback(
  teen: { skills: string[]; hobbies: string[]; bio: string | null },
  job: JobForMatch
): { score: number; explanation: string } {
  const haystack = `${job.title} ${job.category} ${job.description}`.toLowerCase();
  const terms = [...teen.skills, ...teen.hobbies];
  const hits = terms.filter((t) => haystack.includes(t.toLowerCase()));
  const score = terms.length === 0 ? 50 : Math.min(95, 40 + Math.round((hits.length / terms.length) * 55));
  const explanation = hits.length
    ? `Based on keyword overlap (AI scoring unavailable): this job mentions ${hits.slice(0, 3).join(", ")}, which you listed. Set ANTHROPIC_API_KEY for a real skill-fit explanation.`
    : `Based on keyword overlap (AI scoring unavailable): no direct overlap found between your listed skills/hobbies and this job's description. Set ANTHROPIC_API_KEY for a real skill-fit explanation.`;
  return { score, explanation };
}

function parseModelResponse(text: string): { score: number; explanation: string } | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (typeof parsed.score !== "number" || typeof parsed.explanation !== "string") return null;
    return { score: Math.max(0, Math.min(100, Math.round(parsed.score))), explanation: parsed.explanation };
  } catch {
    return null;
  }
}

/**
 * Returns a cached match score if it's still fresh (neither the teen's profile nor the
 * job has changed since it was computed), otherwise calls Claude and upserts a fresh one.
 */
export async function getOrComputeMatchScore(
  supabase: SupabaseClient<Database>,
  teenId: string,
  job: JobForMatch
): Promise<MatchResult> {
  const { data: teenProfile } = await supabase
    .from("teen_profiles")
    .select("skills, hobbies, bio, availability, updated_at")
    .eq("user_id", teenId)
    .single();

  if (!teenProfile) {
    return { score: 0, explanation: "Complete your profile to see match scores.", fromCache: false };
  }

  const { data: cached } = await supabase
    .from("job_matches")
    .select("score, explanation, computed_at")
    .eq("teen_id", teenId)
    .eq("job_id", job.id)
    .maybeSingle();

  const isFresh =
    cached &&
    new Date(cached.computed_at) >= new Date(teenProfile.updated_at) &&
    new Date(cached.computed_at) >= new Date(job.updated_at);

  if (isFresh && cached) {
    return { score: cached.score, explanation: cached.explanation, fromCache: true };
  }

  let result: { score: number; explanation: string };

  const anthropic = getAnthropicClient();
  const withinRateLimit = checkRateLimit(`match-score:${teenId}`, 30, 60_000);

  if (!anthropic || !withinRateLimit) {
    result = heuristicFallback(teenProfile, job);
  } else {
    try {
      const message = await anthropic.messages.create({
        model: MATCH_SCORE_MODEL,
        max_tokens: 300,
        system:
          "You score how well a teen (13-18) fits a part-time/one-time job for a marketplace called HireUp. " +
          "Respond with ONLY a JSON object: {\"score\": <0-100 integer>, \"explanation\": \"<1-2 sentence skill-fit/gap explanation, written to the teen, age-appropriate and encouraging even for a low score>\"}.",
        messages: [
          {
            role: "user",
            content: `Teen profile:
Skills: ${teenProfile.skills.join(", ") || "none listed"}
Hobbies: ${teenProfile.hobbies.join(", ") || "none listed"}
Bio: ${teenProfile.bio ?? "none"}
Availability: ${JSON.stringify(teenProfile.availability)}

Job:
Title: ${job.title}
Category: ${job.category}
Description: ${job.description}`,
          },
        ],
      });

      const text = message.content.find((b) => b.type === "text")?.text ?? "";
      result = parseModelResponse(text) ?? heuristicFallback(teenProfile, job);
    } catch (error) {
      console.error("Anthropic match-score call failed", error);
      result = heuristicFallback(teenProfile, job);
    }
  }

  await supabase.from("job_matches").upsert({
    teen_id: teenId,
    job_id: job.id,
    score: result.score,
    explanation: result.explanation,
    computed_at: new Date().toISOString(),
  });

  return { ...result, fromCache: false };
}

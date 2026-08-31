import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getOrComputeMatchScore } from "@/lib/match-score";

// Server-side only — the Anthropic API key never reaches the client. Called from the
// AI Assistant panel's "refresh" action; job listing/detail pages call
// getOrComputeMatchScore() directly from the server component instead, to avoid an
// extra network hop for the common case.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "teen") {
    return NextResponse.json({ error: "Match scores are only available for teen accounts" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const jobId = body?.jobId;
  if (typeof jobId !== "string") {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, category, description, updated_at")
    .eq("id", jobId)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const result = await getOrComputeMatchScore(supabase, user.id, job);
  return NextResponse.json(result);
}

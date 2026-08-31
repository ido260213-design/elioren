import type { Metadata } from "next";
import { Award, BadgeCheck, Briefcase, Star } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { RatingStars } from "@/components/rating-stars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Work Passport" };

export default async function WorkPassportPage() {
  const { user, profile } = await requireRole(["teen"]);
  const supabase = await createClient();

  const { data: teenProfile } = await supabase
    .from("teen_profiles")
    .select("full_name, bio, skills, hobbies, verification_status")
    .eq("user_id", user.id)
    .single();

  const { data: acceptedApplications } = await supabase
    .from("applications")
    .select("job_id")
    .eq("teen_id", user.id)
    .eq("status", "accepted");

  const jobIds = (acceptedApplications ?? []).map((a) => a.job_id);
  const { data: completedJobs } = jobIds.length
    ? await supabase.from("jobs").select("id, title, category, employer_id").in("id", jobIds).eq("status", "filled")
    : { data: [] };

  const employerIds = [...new Set((completedJobs ?? []).map((j) => j.employer_id))];
  const { data: employers } = employerIds.length
    ? await supabase.from("employer_profiles").select("user_id, display_name").in("user_id", employerIds)
    : { data: [] };
  const employersById = new Map((employers ?? []).map((e) => [e.user_id, e]));

  const { data: ratings } = await supabase
    .from("ratings")
    .select("job_id, stars, review, created_at")
    .eq("ratee_id", user.id)
    .order("created_at", { ascending: false });

  const avgRating = ratings?.length
    ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
    : null;
  const categoriesWorked = [...new Set((completedJobs ?? []).map((j) => j.category))];

  return (
    <DashboardShell role={profile.role} email={profile.email}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Work Passport</h1>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-2xl space-y-6 print:max-w-none">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="size-6 text-primary" />
              <CardTitle className="text-xl">{teenProfile?.full_name}</CardTitle>
              {teenProfile?.verification_status === "verified" && (
                <Badge variant="success" className="gap-1">
                  <BadgeCheck className="size-3" />
                  Verified
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {teenProfile?.bio && <p className="text-sm text-muted-foreground">{teenProfile.bio}</p>}
            <div className="flex flex-wrap gap-1.5">
              {teenProfile?.skills.map((s) => (
                <Badge key={s} variant="outline">
                  {s}
                </Badge>
              ))}
            </div>
            <div className="flex gap-6 pt-2 text-sm">
              <div>
                <p className="text-2xl font-bold">{completedJobs?.length ?? 0}</p>
                <p className="text-muted-foreground">Jobs completed</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-2xl font-bold">
                  {avgRating ? avgRating.toFixed(1) : "—"}
                  {avgRating && <Star className="size-4 fill-warning text-warning" />}
                </p>
                <p className="text-muted-foreground">Average rating</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {categoriesWorked.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-base">
                <Briefcase className="size-4" />
                Experience areas
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {categoriesWorked.map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completed jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {completedJobs?.length ? (
              <div className="space-y-3">
                {completedJobs.map((job) => {
                  const rating = ratings?.find((r) => r.job_id === job.id);
                  return (
                    <div key={job.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{job.title}</p>
                        {rating && <RatingStars value={rating.stars} />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {employersById.get(job.employer_id)?.display_name} · {job.category}
                      </p>
                      {rating?.review && <p className="mt-1 text-sm italic">&ldquo;{rating.review}&rdquo;</p>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No completed jobs yet — this fills in automatically as you finish work on HireUp.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

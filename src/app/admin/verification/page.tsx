import type { Metadata } from "next";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReviewButtons } from "./review-buttons";

export const metadata: Metadata = { title: "Verification queue" };

export default async function AdminVerificationPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("verification_requests")
    .select("id, user_id, note, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const userIds = [...new Set((requests ?? []).map((r) => r.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, role, email").in("id", userIds)
    : { data: [] };
  const profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const teenIds = (profiles ?? []).filter((p) => p.role === "teen").map((p) => p.id);
  const employerIds = (profiles ?? []).filter((p) => p.role !== "teen").map((p) => p.id);

  const { data: teens } = teenIds.length
    ? await supabase.from("teen_profiles").select("user_id, full_name").in("user_id", teenIds)
    : { data: [] };
  const { data: employers } = employerIds.length
    ? await supabase.from("employer_profiles").select("user_id, display_name").in("user_id", employerIds)
    : { data: [] };
  const teensById = new Map((teens ?? []).map((t) => [t.user_id, t]));
  const employersById = new Map((employers ?? []).map((e) => [e.user_id, e]));

  return (
    <AdminShell>
      <h1 className="mb-6 text-2xl font-bold">Verification queue</h1>
      {requests?.length ? (
        <div className="space-y-3">
          {requests.map((request) => {
            const profile = profilesById.get(request.user_id);
            const name =
              profile?.role === "teen"
                ? teensById.get(request.user_id)?.full_name
                : employersById.get(request.user_id)?.display_name;

            return (
              <Card key={request.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <div>
                    <p className="font-medium">{name ?? profile?.email ?? "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.email} <Badge variant="outline" className="ml-1">{profile?.role}</Badge>
                    </p>
                    {request.note && <p className="mt-1 text-sm">{request.note}</p>}
                  </div>
                  <ReviewButtons requestId={request.id} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No pending verification requests.</p>
      )}
    </AdminShell>
  );
}

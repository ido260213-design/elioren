import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const { user, profile } = await requireUser();
  const supabase = await createClient();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, application_id, created_at")
    .order("created_at", { ascending: false });

  const applicationIds = [...new Set((conversations ?? []).map((c) => c.application_id))];
  const { data: applications } = applicationIds.length
    ? await supabase.from("applications").select("id, job_id, teen_id").in("id", applicationIds)
    : { data: [] };
  const applicationsById = new Map((applications ?? []).map((a) => [a.id, a]));

  const jobIds = [...new Set((applications ?? []).map((a) => a.job_id))];
  const { data: jobs } = jobIds.length
    ? await supabase.from("jobs").select("id, title, employer_id").in("id", jobIds)
    : { data: [] };
  const jobsById = new Map((jobs ?? []).map((j) => [j.id, j]));

  const teenIds = [...new Set((applications ?? []).map((a) => a.teen_id))];
  const employerIds = [...new Set((jobs ?? []).map((j) => j.employer_id))];

  const { data: teens } = teenIds.length
    ? await supabase.from("teen_profiles").select("user_id, full_name").in("user_id", teenIds)
    : { data: [] };
  const { data: employers } = employerIds.length
    ? await supabase.from("employer_profiles").select("user_id, display_name").in("user_id", employerIds)
    : { data: [] };
  const teensById = new Map((teens ?? []).map((t) => [t.user_id, t]));
  const employersById = new Map((employers ?? []).map((e) => [e.user_id, e]));

  const conversationIds = (conversations ?? []).map((c) => c.id);
  const { data: unreadMessages } = conversationIds.length
    ? await supabase
        .from("messages")
        .select("conversation_id, sender_id, body, created_at, read_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const lastMessageByConversation = new Map<string, { body: string | null; created_at: string }>();
  const unreadCountByConversation = new Map<string, number>();
  for (const m of unreadMessages ?? []) {
    if (!lastMessageByConversation.has(m.conversation_id)) {
      lastMessageByConversation.set(m.conversation_id, { body: m.body, created_at: m.created_at });
    }
    if (m.sender_id !== user.id && !m.read_at) {
      unreadCountByConversation.set(m.conversation_id, (unreadCountByConversation.get(m.conversation_id) ?? 0) + 1);
    }
  }

  return (
    <DashboardShell role={profile.role} email={profile.email}>
      <h1 className="mb-6 text-2xl font-bold">Messages</h1>
      {conversations?.length ? (
        <div className="space-y-3">
          {conversations.map((c) => {
            const application = applicationsById.get(c.application_id);
            const job = application ? jobsById.get(application.job_id) : undefined;
            const otherName =
              user.id === application?.teen_id
                ? employersById.get(job?.employer_id ?? "")?.display_name
                : teensById.get(application?.teen_id ?? "")?.full_name;
            const lastMessage = lastMessageByConversation.get(c.id);
            const unread = unreadCountByConversation.get(c.id) ?? 0;

            return (
              <Link key={c.id} href={`/messages/${c.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                        <MessageSquare className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{otherName ?? "HireUp user"}</p>
                        <p className="text-sm text-muted-foreground">
                          {job?.title} · {lastMessage?.body ?? "Photo"}
                        </p>
                      </div>
                    </div>
                    {unread > 0 && <Badge>{unread}</Badge>}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No conversations yet.</p>
      )}
    </DashboardShell>
  );
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { ChatThread } from "@/components/chat-thread";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const { user, profile } = await requireUser();
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, application_id")
    .eq("id", conversationId)
    .maybeSingle();

  // RLS already scopes conversations to their two participants, so a null result here
  // means either it doesn't exist or the current user isn't one of them — same response.
  if (!conversation) notFound();

  const { data: application } = await supabase
    .from("applications")
    .select("teen_id, job_id")
    .eq("id", conversation.application_id)
    .single();

  const { data: job } = await supabase.from("jobs").select("title, employer_id").eq("id", application!.job_id).single();

  const otherParticipantName =
    user.id === application!.teen_id
      ? (await supabase.from("employer_profiles").select("display_name").eq("user_id", job!.employer_id).single()).data
          ?.display_name
      : (await supabase.from("teen_profiles").select("full_name").eq("user_id", application!.teen_id).single()).data
          ?.full_name;

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return (
    <DashboardShell role={profile.role} email={profile.email}>
      <h1 className="mb-2 text-lg font-semibold">{otherParticipantName ?? "Conversation"}</h1>
      <p className="mb-4 text-sm text-muted-foreground">Re: {job?.title}</p>
      <ChatThread
        conversationId={conversationId}
        currentUserId={user.id}
        initialMessages={messages ?? []}
        otherParticipantName={otherParticipantName ?? "They"}
      />
    </DashboardShell>
  );
}

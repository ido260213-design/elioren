"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { screenContent } from "@/lib/moderation";

export type SendMessageState = { error?: string } | undefined;

export async function getOrCreateConversation(applicationId: string): Promise<{ id: string } | { error: string }> {
  await requireUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("application_id", applicationId)
    .maybeSingle();

  if (existing) return { id: existing.id };

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ application_id: applicationId })
    .select("id")
    .single();

  if (error || !created) return { error: "Couldn't start a conversation." };

  return { id: created.id };
}

export async function sendMessage(
  conversationId: string,
  _prevState: SendMessageState,
  formData: FormData
): Promise<SendMessageState> {
  const { user } = await requireUser();
  const supabase = await createClient();

  const body = (formData.get("body") as string | null)?.trim() || null;
  const imageUrl = (formData.get("imageUrl") as string | null)?.trim() || null;

  if (!body && !imageUrl) {
    return { error: "Write a message or attach a photo." };
  }

  if (body) {
    const screening = screenContent(body);
    if (screening.blocked) {
      return { error: `Message blocked: ${screening.reason}. Keep chats and payments on HireUp.` };
    }
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body,
    image_url: imageUrl,
  });

  if (error) {
    return { error: "Couldn't send your message — try again." };
  }

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return undefined;
}

export async function markMessagesRead(conversationId: string) {
  const { user } = await requireUser();
  const supabase = await createClient();

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", user.id)
    .is("read_at", null);
}

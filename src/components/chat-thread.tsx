"use client";

import * as React from "react";
import { useActionState } from "react";
import { ImagePlus, Send } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { sendMessage, markMessagesRead, type SendMessageState } from "@/lib/actions/messages";
import type { Database } from "@/lib/supabase/database.types";

type Message = Database["public"]["Tables"]["messages"]["Row"];

const TYPING_TIMEOUT_MS = 3000;

function ChatImage({ path }: { path: string }) {
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.storage
      .from("chat-images")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled && data) setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) return <div className="h-40 w-40 animate-pulse rounded-md bg-muted" />;
  // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URLs aren't a static, next/image-friendly source
  return <img src={url} alt="Attachment" className="max-h-64 max-w-64 rounded-md object-cover" />;
}

export function ChatThread({
  conversationId,
  currentUserId,
  initialMessages,
  otherParticipantName,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
  otherParticipantName: string;
}) {
  const [messages, setMessages] = React.useState(initialMessages);
  const [otherTyping, setOtherTyping] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [pendingImagePath, setPendingImagePath] = React.useState<string | null>(null);
  const boundSend = sendMessage.bind(null, conversationId);
  const [state, formAction, isPending] = useActionState<SendMessageState, FormData>(boundSend, undefined);
  const formRef = React.useRef<HTMLFormElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const typingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = React.useRef<RealtimeChannel | null>(null);

  React.useEffect(() => {
    void markMessagesRead(conversationId);
  }, [conversationId]);

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]));
          if (newMessage.sender_id !== currentUserId) {
            void markMessagesRead(conversationId);
          }
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ userId: string; typing: boolean }>();
        const someoneElseTyping = Object.values(state)
          .flat()
          .some((p) => p.userId !== currentUserId && p.typing);
        setOtherTyping(someoneElseTyping);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId: currentUserId, typing: false });
        }
      });

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  React.useEffect(() => {
    if (!isPending && !state?.error) {
      formRef.current?.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear the attached-photo preview once the send action reports success
      setPendingImagePath(null);
    }
  }, [isPending, state]);

  function notifyTyping() {
    const channel = channelRef.current;
    if (!channel) return;
    channel.track({ userId: currentUserId, typing: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channel.track({ userId: currentUserId, typing: false });
    }, TYPING_TIMEOUT_MS);
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${conversationId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("chat-images").upload(path, file);
    setUploading(false);
    if (!error) setPendingImagePath(path);
    e.target.value = "";
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-xs rounded-2xl px-3 py-2 text-sm sm:max-w-sm",
                  mine ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                {m.image_url && <ChatImage path={m.image_url} />}
              </div>
              <span className="mt-0.5 text-xs text-muted-foreground">
                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {mine && m.read_at && " · Read"}
              </span>
            </div>
          );
        })}
        {otherTyping && (
          <p className="text-xs text-muted-foreground italic">{otherParticipantName} is typing...</p>
        )}
        <div ref={bottomRef} />
      </div>

      {state?.error && <p className="mb-2 text-sm text-destructive">{state.error}</p>}
      {pendingImagePath && <p className="mb-2 text-xs text-muted-foreground">Photo attached — send to deliver it.</p>}

      <form ref={formRef} action={formAction} className="flex items-center gap-2 border-t border-border pt-3">
        <input type="hidden" name="imageUrl" value={pendingImagePath ?? ""} />
        <label className="cursor-pointer text-muted-foreground hover:text-foreground">
          <ImagePlus className="size-5" />
          <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} disabled={uploading} />
        </label>
        <Input name="body" placeholder="Message..." autoComplete="off" onChange={notifyTyping} />
        <Button type="submit" size="icon" disabled={isPending || uploading}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

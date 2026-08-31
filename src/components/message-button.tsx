"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getOrCreateConversation } from "@/lib/actions/messages";

export function MessageButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await getOrCreateConversation(applicationId);
      if ("id" in result) router.push(`/messages/${result.id}`);
    });
  }

  return (
    <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={isPending} onClick={handleClick}>
      <MessageSquare className="size-3.5" />
      Message
    </Button>
  );
}

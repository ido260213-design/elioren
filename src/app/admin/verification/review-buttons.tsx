"use client";

import * as React from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { reviewVerificationRequest } from "./actions";

export function ReviewButtons({ requestId }: { requestId: string }) {
  const [isPending, startTransition] = React.useTransition();

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(() => reviewVerificationRequest(requestId, "approved"))}
      >
        <Check className="size-3.5" />
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(() => reviewVerificationRequest(requestId, "rejected"))}
      >
        <X className="size-3.5" />
        Reject
      </Button>
    </div>
  );
}

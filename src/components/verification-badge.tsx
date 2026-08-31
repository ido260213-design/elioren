"use client";

import * as React from "react";
import { BadgeCheck, ShieldQuestion } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requestVerification } from "@/lib/actions/verification";
import type { VerificationStatus } from "@/lib/supabase/database.types";

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const [isPending, startTransition] = React.useTransition();
  const [requested, setRequested] = React.useState(status === "pending");
  const [error, setError] = React.useState<string | null>(null);

  if (status === "verified") {
    return (
      <Badge variant="success" className="gap-1">
        <BadgeCheck className="size-3" />
        Verified
      </Badge>
    );
  }

  if (status === "pending" || requested) {
    return (
      <Badge variant="outline" className="gap-1">
        <ShieldQuestion className="size-3" />
        Verification pending
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline">Unverified</Badge>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await requestVerification();
            if (result?.error) setError(result.error);
            else setRequested(true);
          })
        }
      >
        {isPending ? "Requesting..." : "Request verification"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

"use client";

import * as React from "react";
import { HandCoins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { releaseEscrowPayment } from "@/lib/actions/payments";

export function ReleasePaymentButton({
  applicationId,
  alreadyReleased,
}: {
  applicationId: string;
  alreadyReleased: boolean;
}) {
  const [isPending, startTransition] = React.useTransition();
  const [released, setReleased] = React.useState(alreadyReleased);

  if (released) {
    return <span className="text-xs text-success">Payment released</span>;
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-1.5"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await releaseEscrowPayment(applicationId);
          setReleased(true);
        })
      }
    >
      <HandCoins className="size-3.5" />
      {isPending ? "Releasing..." : "Release payment"}
    </Button>
  );
}

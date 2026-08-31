"use client";

import { useActionState } from "react";
import { CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fundJobEscrow, type PaymentActionState } from "@/lib/actions/payments";

export function FundEscrowButton({ applicationId }: { applicationId: string }) {
  const boundAction = fundJobEscrow.bind(null, applicationId);
  const [state, formAction, isPending] = useActionState<PaymentActionState, FormData>(boundAction, undefined);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <Button type="submit" size="sm" variant="outline" disabled={isPending} className="gap-1.5">
        <CreditCard className="size-3.5" />
        {isPending ? "Starting checkout..." : "Fund escrow"}
      </Button>
      {state?.error && <p className="max-w-48 text-right text-xs text-destructive">{state.error}</p>}
    </form>
  );
}

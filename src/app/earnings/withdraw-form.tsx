"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { withdrawEarnings, type WithdrawState } from "@/lib/actions/payments";

export function WithdrawForm({ availableBalance }: { availableBalance: number }) {
  const [state, formAction, isPending] = useActionState<WithdrawState, FormData>(withdrawEarnings, undefined);

  if (state?.success) {
    return <p className="text-sm text-success">Withdrawal sent to your guardian&apos;s account.</p>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="amount">Amount to withdraw ($)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          max={availableBalance}
          defaultValue={availableBalance || undefined}
          required
        />
      </div>
      <Button type="submit" disabled={isPending || availableBalance <= 0}>
        {isPending ? "Processing..." : "Withdraw"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

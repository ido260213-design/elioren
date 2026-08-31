"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { linkGuardianPayoutAccount, type LinkGuardianPayoutState } from "@/lib/actions/guardian-payout";

export function LinkGuardianForm() {
  const [state, formAction, isPending] = useActionState<LinkGuardianPayoutState, FormData>(
    linkGuardianPayoutAccount,
    undefined
  );

  if (state?.success) {
    return (
      <p className="text-sm text-muted-foreground">
        We emailed your guardian a setup link. Once they finish, you&apos;ll be able to withdraw here.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="guardianEmail">Parent/guardian email</Label>
        <Input id="guardianEmail" name="guardianEmail" type="email" required placeholder="parent@example.com" />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Link guardian account"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

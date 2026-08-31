"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { completeEmployerOnboarding, type EmployerOnboardingState } from "./actions";
import type { EmployerAccountType } from "@/lib/supabase/database.types";

export function EmployerOnboardingForm({ accountType }: { accountType: EmployerAccountType }) {
  const [state, formAction, isPending] = useActionState<EmployerOnboardingState, FormData>(
    completeEmployerOnboarding,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="accountType" value={accountType} />

      <div className="space-y-2">
        <Label htmlFor="displayName">
          {accountType === "business" ? "Business name" : "Your name / household name"}
        </Label>
        <Input
          id="displayName"
          name="displayName"
          required
          placeholder={accountType === "business" ? "Riverside Cafe" : "The Nguyen Family"}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Short description</Label>
        <Textarea
          id="bio"
          name="bio"
          rows={4}
          placeholder={
            accountType === "business"
              ? "What does your business do, and what kind of help are you looking for?"
              : "What kind of help do you usually need around the house?"
          }
        />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving..." : "Finish"}
      </Button>
    </form>
  );
}

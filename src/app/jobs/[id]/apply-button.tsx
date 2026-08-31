"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { applyToJob, type ApplyState } from "./actions";

export function ApplyButton({ jobId, alreadyApplied }: { jobId: string; alreadyApplied: boolean }) {
  const boundApply = applyToJob.bind(null, jobId);
  const [state, formAction, isPending] = useActionState<ApplyState, FormData>(boundApply, undefined);

  const applied = alreadyApplied || state?.success;

  if (applied) {
    return (
      <Button disabled className="gap-1.5">
        <CheckCircle2 className="size-4" />
        Applied
      </Button>
    );
  }

  return (
    <form action={formAction}>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Applying..." : "Apply now"}
      </Button>
      {state?.error && <p className="mt-2 text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

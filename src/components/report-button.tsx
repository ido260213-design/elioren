"use client";

import * as React from "react";
import { useActionState } from "react";
import { Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { fileReport, type FileReportState } from "@/lib/actions/report";
import type { ReportTargetType } from "@/lib/supabase/database.types";

export function ReportButton({ targetType, targetId }: { targetType: ReportTargetType; targetId: string }) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, isPending] = useActionState<FileReportState, FormData>(fileReport, undefined);

  React.useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Flag className="size-3.5" />
        Report
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this {targetType}</DialogTitle>
          <DialogDescription>
            Our team reviews every report. Tell us what&apos;s wrong.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />
          <Textarea name="reason" required rows={4} placeholder="What's the issue?" />
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Submitting..." : "Submit report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

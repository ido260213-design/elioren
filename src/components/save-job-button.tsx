"use client";

import * as React from "react";
import { Bookmark } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveJob, unsaveJob } from "@/lib/actions/saved-jobs";

export function SaveJobButton({ jobId, saved }: { jobId: string; saved: boolean }) {
  const [isSaved, setIsSaved] = React.useState(saved);
  const [isPending, startTransition] = React.useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !isSaved;
    setIsSaved(next);
    startTransition(() => (next ? saveJob(jobId) : unsaveJob(jobId)));
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={isPending}
      onClick={toggle}
      aria-pressed={isSaved}
      aria-label={isSaved ? "Remove from saved jobs" : "Save job"}
      className="shrink-0"
    >
      <Bookmark className={cn("size-4", isSaved && "fill-primary text-primary")} />
    </Button>
  );
}

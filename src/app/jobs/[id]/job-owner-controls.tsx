"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { updateJobStatus } from "./actions";
import type { JobStatus } from "@/lib/supabase/database.types";

export function JobOwnerControls({ jobId, status }: { jobId: string; status: JobStatus }) {
  const [isPending, startTransition] = React.useTransition();

  function setStatus(next: JobStatus) {
    startTransition(() => updateJobStatus(jobId, next));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "open" && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => setStatus("filled")}>
          Mark filled
        </Button>
      )}
      {status !== "closed" && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => setStatus("closed")}>
          Close job
        </Button>
      )}
      {status !== "open" && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => setStatus("open")}>
          Reopen
        </Button>
      )}
    </div>
  );
}

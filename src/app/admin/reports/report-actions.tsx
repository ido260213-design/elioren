"use client";

import * as React from "react";
import { Ban, Check, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dismissReport, removeReportedJob, blockReportedUser } from "./actions";
import type { ReportTargetType } from "@/lib/supabase/database.types";

export function ReportActions({
  reportId,
  reporterId,
  targetType,
  targetId,
}: {
  reportId: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
}) {
  const [isPending, startTransition] = React.useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {targetType === "job" && (
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() => startTransition(() => removeReportedJob(reportId, targetId))}
        >
          <EyeOff className="size-3.5" />
          Remove post
        </Button>
      )}
      {targetType === "profile" && (
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() => startTransition(() => blockReportedUser(reportId, reporterId, targetId))}
        >
          <Ban className="size-3.5" />
          Block user
        </Button>
      )}
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => startTransition(() => dismissReport(reportId))}>
        <Check className="size-3.5" />
        Dismiss
      </Button>
    </div>
  );
}

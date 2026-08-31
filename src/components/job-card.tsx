import Link from "next/link";
import { MapPin, Users, BadgeCheck, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SaveJobButton } from "@/components/save-job-button";
import type { JobStatus, PayType, VerificationStatus } from "@/lib/supabase/database.types";

export interface JobCardData {
  id: string;
  title: string;
  category: string;
  location_text: string;
  pay_type: PayType;
  pay_amount: number;
  age_min: number;
  age_max: number;
  workers_needed: number;
  status: JobStatus;
  employer_display_name?: string | null;
  employer_verification_status?: VerificationStatus | null;
}

function formatPay(payType: PayType, amount: number) {
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  return payType === "hourly" ? `${money}/hr` : `${money} fixed`;
}

export function JobCard({
  job,
  saved,
  matchScore,
}: {
  job: JobCardData;
  /** Pass a boolean (teen viewers only) to render the bookmark toggle. */
  saved?: boolean;
  /** Pass 0–100 (teen viewers only) to render the AI match score badge. */
  matchScore?: number;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">
            <Link href={`/jobs/${job.id}`} className="hover:underline">
              {job.title}
            </Link>
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1">
            <Badge variant="secondary">{formatPay(job.pay_type, job.pay_amount)}</Badge>
            {saved !== undefined && <SaveJobButton jobId={job.id} saved={saved} />}
          </div>
        </div>
        {job.employer_display_name && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            {job.employer_display_name}
            {job.employer_verification_status === "verified" && (
              <BadgeCheck className="size-3.5 text-primary" aria-label="Verified" />
            )}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" />
            {job.location_text}
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5" />
            {job.workers_needed} needed
          </span>
          <span>
            Ages {job.age_min}–{job.age_max}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{job.category}</Badge>
          {matchScore !== undefined && (
            <Badge variant="success" className="gap-1">
              <Sparkles className="size-3" />
              {matchScore}% match
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

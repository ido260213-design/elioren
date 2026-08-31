"use client";

import * as React from "react";
import { MessagesSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateInterviewPrep } from "@/lib/actions/assistant";

export function InterviewPrepTool({ jobs }: { jobs: { id: string; title: string }[] }) {
  const [jobId, setJobId] = React.useState(jobs[0]?.id ?? "");
  const [isPending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function handleGenerate() {
    if (!jobId) return;
    startTransition(async () => {
      setError(null);
      const state = await generateInterviewPrep(jobId);
      if (state?.error) setError(state.error);
      else setResult(state?.result ?? null);
    });
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            <MessagesSquare className="size-4 text-primary" />
            Interview prep
          </CardTitle>
          <CardDescription>Apply to a job to get tailored interview-prep tips.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <MessagesSquare className="size-4 text-primary" />
          Interview prep
        </CardTitle>
        <CardDescription>Tailored tips for a job you&apos;ve applied to.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          <Select value={jobId} onValueChange={setJobId}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleGenerate} disabled={isPending}>
            {isPending ? "Generating..." : "Get tips"}
          </Button>
        </div>
        {result && <p className="whitespace-pre-wrap text-sm">{result}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

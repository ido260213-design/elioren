"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { generateWorkPassportDraft } from "@/lib/actions/assistant";

export function WorkPassportTool() {
  const [isPending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function handleGenerate() {
    startTransition(async () => {
      setError(null);
      const state = await generateWorkPassportDraft();
      if (state?.error) setError(state.error);
      else setResult(state?.result ?? null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Sparkles className="size-4 text-primary" />
          Work Passport draft
        </CardTitle>
        <CardDescription>
          A first-draft summary of your experience, generated from your profile and completed jobs. A polished,
          exportable Work Passport comes in a later update.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {result ? (
          <p className="mb-4 whitespace-pre-wrap text-sm">{result}</p>
        ) : (
          error && <p className="mb-4 text-sm text-destructive">{error}</p>
        )}
        <Button variant="outline" onClick={handleGenerate} disabled={isPending}>
          {isPending ? "Generating..." : result ? "Regenerate" : "Generate draft"}
        </Button>
      </CardContent>
    </Card>
  );
}

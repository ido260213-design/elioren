import { Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function MatchScoreCard({ score, explanation }: { score: number; explanation: string }) {
  return (
    <Card className="mb-6 border-primary/30 bg-accent/40">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Sparkles className="size-4 text-primary" />
            AI match score
          </div>
          <span className="text-lg font-bold text-primary">{score}%</span>
        </div>
        <Progress value={score} />
        <p className="text-sm text-muted-foreground">{explanation}</p>
      </CardContent>
    </Card>
  );
}

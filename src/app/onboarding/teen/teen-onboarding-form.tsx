"use client";

import * as React from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { completeTeenOnboarding, type TeenOnboardingState } from "./actions";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TOTAL_STEPS = 2;

export function TeenOnboardingForm() {
  const [step, setStep] = React.useState(1);
  const [state, formAction, isPending] = useActionState<TeenOnboardingState, FormData>(
    completeTeenOnboarding,
    undefined
  );

  return (
    <form action={formAction} className="space-y-6">
      <Progress value={(step / TOTAL_STEPS) * 100} />

      <div className={cn("space-y-4", step !== 1 && "hidden")}>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" required placeholder="Jamie Rivera" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
          <p className="text-xs text-muted-foreground">You must be 13–18 to use HireUp.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="guardianEmail">Parent/guardian email</Label>
          <Input id="guardianEmail" name="guardianEmail" type="email" required placeholder="parent@example.com" />
          <p className="text-xs text-muted-foreground">
            We&apos;ll send a confirmation link — your account stays active while you wait, but shows a
            pending banner until they confirm.
          </p>
        </div>
        <Button type="button" className="w-full" onClick={() => setStep(2)}>
          Continue
        </Button>
      </div>

      <div className={cn("space-y-4", step !== 2 && "hidden")}>
        <div className="space-y-2">
          <Label htmlFor="skills">Skills (comma-separated)</Label>
          <Input id="skills" name="skills" placeholder="Babysitting, Yard work, Excel" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hobbies">Hobbies (comma-separated)</Label>
          <Input id="hobbies" name="hobbies" placeholder="Soccer, Drawing, Gaming" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Short bio</Label>
          <Textarea id="bio" name="bio" rows={3} placeholder="Tell employers a bit about yourself" />
        </div>
        <div className="space-y-2">
          <Label>Usually available</Label>
          <div className="flex flex-wrap gap-3">
            {DAYS.map((day) => (
              <label key={day} className="flex items-center gap-1.5 text-sm">
                <Checkbox name="availabilityDays" value={day} />
                {day}
              </label>
            ))}
          </div>
        </div>

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
            Back
          </Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? "Saving..." : "Finish"}
          </Button>
        </div>
      </div>
    </form>
  );
}

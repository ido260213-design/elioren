"use client";

import * as React from "react";
import { useActionState } from "react";
import { Star } from "lucide-react";

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
import { RatingStarsInput } from "@/components/rating-stars";
import { submitRating, type SubmitRatingState } from "@/lib/actions/ratings";

export function RateParticipantDialog({
  jobId,
  rateeId,
  rateeName,
  alreadyRated,
}: {
  jobId: string;
  rateeId: string;
  rateeName: string;
  alreadyRated: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, isPending] = useActionState<SubmitRatingState, FormData>(submitRating, undefined);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close the dialog once the server action reports success
    if (state?.success) setOpen(false);
  }, [state]);

  if (alreadyRated || state?.success) {
    return (
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <Star className="size-3.5 fill-warning text-warning" />
        Rated
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Leave a rating
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate {rateeName}</DialogTitle>
          <DialogDescription>This job is marked complete — let others know how it went.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="rateeId" value={rateeId} />
          <RatingStarsInput name="stars" />
          <Textarea name="review" rows={3} placeholder="Optional review" />
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Submitting..." : "Submit rating"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

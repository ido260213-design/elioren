"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOB_CATEGORIES } from "@/lib/validations/jobs";
import { postJob, type JobPostState } from "./actions";

export function JobPostForm() {
  const [state, formAction, isPending] = useActionState<JobPostState, FormData>(postJob, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Job title</Label>
        <Input id="title" name="title" required placeholder="Weekend dog walker" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select name="category" defaultValue={JOB_CATEGORIES[0]}>
          <SelectTrigger id="category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOB_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="locationText">Location</Label>
        <Input id="locationText" name="locationText" required placeholder="Austin, TX" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="payType">Pay type</Label>
          <Select name="payType" defaultValue="hourly">
            <SelectTrigger id="payType" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="fixed">Fixed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="payAmount">Pay amount ($)</Label>
          <Input id="payAmount" name="payAmount" type="number" min="0" step="0.01" required placeholder="15.00" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ageMin">Min age</Label>
          <Input id="ageMin" name="ageMin" type="number" min={13} max={18} defaultValue={13} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ageMax">Max age</Label>
          <Input id="ageMax" name="ageMax" type="number" min={13} max={18} defaultValue={18} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workersNeeded">Workers needed</Label>
          <Input id="workersNeeded" name="workersNeeded" type="number" min={1} defaultValue={1} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={5} required placeholder="What does the job involve?" />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Posting..." : "Post job"}
      </Button>
    </form>
  );
}

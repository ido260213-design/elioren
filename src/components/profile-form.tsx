"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileFormState } from "@/app/profile/actions";

interface TeenFields {
  kind: "teen";
  fullName: string;
  bio: string | null;
  skills: string[];
  hobbies: string[];
}

interface EmployerFields {
  kind: "employer";
  displayName: string;
  bio: string | null;
}

export function ProfileForm({
  fields,
  action,
}: {
  fields: TeenFields | EmployerFields;
  action: (state: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
}) {
  const [state, formAction, isPending] = useActionState<ProfileFormState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {fields.kind === "teen" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" defaultValue={fields.fullName} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skills">Skills (comma-separated)</Label>
            <Input id="skills" name="skills" defaultValue={fields.skills.join(", ")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hobbies">Hobbies (comma-separated)</Label>
            <Input id="hobbies" name="hobbies" defaultValue={fields.hobbies.join(", ")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" rows={4} defaultValue={fields.bio ?? ""} />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" name="displayName" defaultValue={fields.displayName} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" rows={4} defaultValue={fields.bio ?? ""} />
          </div>
        </>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">Saved.</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}

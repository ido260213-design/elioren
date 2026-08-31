"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Briefcase, Building2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { signUp, type SignupState } from "./actions";
import type { UserRole } from "@/lib/supabase/database.types";

const ROLE_OPTIONS: { value: Exclude<UserRole, "admin">; label: string; icon: React.ElementType }[] = [
  { value: "teen", label: "Teen", icon: User },
  { value: "employer", label: "Employer", icon: Briefcase },
  { value: "business", label: "Business", icon: Building2 },
];

export function SignupForm() {
  const [role, setRole] = React.useState<Exclude<UserRole, "admin">>("teen");
  const [state, formAction, isPending] = useActionState<SignupState, FormData>(signUp, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label>I am a...</Label>
        <div className="grid grid-cols-3 gap-2">
          {ROLE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setRole(value)}
              aria-pressed={role === value}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors",
                role === value
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-input text-muted-foreground hover:bg-accent/50"
              )}
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </div>
        <input type="hidden" name="role" value={role} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating account..." : "Create account"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        By signing up you agree this account may be used by a minor under a parent/guardian&apos;s
        knowledge. Teen accounts require guardian email confirmation.
      </p>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

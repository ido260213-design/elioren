"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { employerOnboardingSchema } from "@/lib/validations/onboarding";
import type { EmployerAccountType } from "@/lib/supabase/database.types";

export type EmployerOnboardingState = { error?: string } | undefined;

export async function completeEmployerOnboarding(
  _prevState: EmployerOnboardingState,
  formData: FormData
): Promise<EmployerOnboardingState> {
  const accountType = formData.get("accountType") as EmployerAccountType;
  const { user } = await requireRole([accountType]);

  const parsed = employerOnboardingSchema.safeParse({
    accountType,
    displayName: formData.get("displayName"),
    bio: formData.get("bio") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("employer_profiles").insert({
    user_id: user.id,
    display_name: parsed.data.displayName,
    account_type: parsed.data.accountType,
    bio: parsed.data.bio ?? null,
  });

  if (error) {
    return { error: error.code === "23505" ? "You've already completed onboarding." : error.message };
  }

  redirect(`/dashboard/${parsed.data.accountType}`);
}

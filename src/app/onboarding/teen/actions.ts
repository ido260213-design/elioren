"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { teenOnboardingSchema } from "@/lib/validations/onboarding";
import { sendEmail, guardianConfirmationEmail } from "@/lib/email";

export type TeenOnboardingState = { error?: string } | undefined;

function parseList(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function completeTeenOnboarding(
  _prevState: TeenOnboardingState,
  formData: FormData
): Promise<TeenOnboardingState> {
  const { user } = await requireRole(["teen"]);

  const availabilityDays = formData.getAll("availabilityDays") as string[];

  const parsed = teenOnboardingSchema.safeParse({
    fullName: formData.get("fullName"),
    dateOfBirth: formData.get("dateOfBirth"),
    guardianEmail: formData.get("guardianEmail"),
    skills: parseList(formData.get("skills")),
    hobbies: parseList(formData.get("hobbies")),
    bio: formData.get("bio") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("teen_profiles").insert({
    user_id: user.id,
    full_name: parsed.data.fullName,
    date_of_birth: parsed.data.dateOfBirth,
    guardian_email: parsed.data.guardianEmail,
    skills: parsed.data.skills,
    hobbies: parsed.data.hobbies,
    bio: parsed.data.bio ?? null,
    availability: Object.fromEntries(availabilityDays.map((d) => [d, [{ start: "15:00", end: "19:00" }]])),
  });

  if (error) {
    return { error: error.code === "23505" ? "You've already completed onboarding." : error.message };
  }

  // The confirmation token is minted by the DB default (gen_random_uuid()), so read it
  // back before emailing the confirmation link.
  const { data: teenProfile } = await supabase
    .from("teen_profiles")
    .select("guardian_confirmation_token")
    .eq("user_id", user.id)
    .single();

  if (teenProfile) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const confirmUrl = `${siteUrl}/api/guardian/confirm?token=${teenProfile.guardian_confirmation_token}`;
    const { subject, html } = guardianConfirmationEmail({ teenName: parsed.data.fullName, confirmUrl });
    await sendEmail({ to: parsed.data.guardianEmail, subject, html });
  }

  redirect("/dashboard/teen");
}

"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/validations/auth";
import type { UserRole } from "@/lib/supabase/database.types";

export type SignupState = { error?: string; checkEmail?: boolean } | undefined;

export async function signUp(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    role: formData.get("role"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const { role, email, password } = parsed.data;

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role },
      emailRedirectTo: `${siteUrl}/auth/callback?next=/onboarding/${role}`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Supabase Cloud projects require email confirmation by default (this repo's local
  // supabase/config.toml disables it for frictionless dev) — signUp() then returns no
  // session. Redirecting to onboarding in that case would just bounce straight back to
  // /login (no session = no access), which reads as a broken signup. Show a "check
  // your email" message instead; the confirmation link signs them in for real.
  if (!data.session) {
    return { checkEmail: true };
  }

  redirect(`/onboarding/${role as UserRole}`);
}

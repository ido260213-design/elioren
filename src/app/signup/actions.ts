"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/validations/auth";
import type { UserRole } from "@/lib/supabase/database.types";

export type SignupState = { error?: string } | undefined;

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
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role } },
  });

  if (error) {
    return { error: error.message };
  }

  redirect(`/onboarding/${role as UserRole}`);
}

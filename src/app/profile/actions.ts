"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export type ProfileFormState = { error?: string; success?: boolean } | undefined;

function parseList(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function updateTeenProfile(_prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const { user } = await requireRole(["teen"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("teen_profiles")
    .update({
      full_name: formData.get("fullName") as string,
      bio: (formData.get("bio") as string) || null,
      skills: parseList(formData.get("skills")),
      hobbies: parseList(formData.get("hobbies")),
    })
    .eq("user_id", user.id);

  if (error) return { error: "Couldn't save your profile — try again." };

  revalidatePath("/profile");
  return { success: true };
}

export async function updateEmployerProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const { user } = await requireRole(["employer", "business"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("employer_profiles")
    .update({
      display_name: formData.get("displayName") as string,
      bio: (formData.get("bio") as string) || null,
    })
    .eq("user_id", user.id);

  if (error) return { error: "Couldn't save your profile — try again." };

  revalidatePath("/profile");
  return { success: true };
}

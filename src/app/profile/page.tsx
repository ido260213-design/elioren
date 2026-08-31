import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileForm } from "@/components/profile-form";
import { GuardianPendingBanner } from "@/components/guardian-pending-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateTeenProfile, updateEmployerProfile } from "./actions";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { user, profile } = await requireUser();
  const supabase = await createClient();

  if (profile.role === "teen") {
    const { data: teenProfile } = await supabase
      .from("teen_profiles")
      .select("full_name, bio, skills, hobbies, guardian_email, guardian_confirmed_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!teenProfile) redirect("/onboarding/teen");

    return (
      <DashboardShell role={profile.role} email={profile.email}>
        {!teenProfile.guardian_confirmed_at && (
          <GuardianPendingBanner guardianEmail={teenProfile.guardian_email} />
        )}
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm
              fields={{
                kind: "teen",
                fullName: teenProfile.full_name,
                bio: teenProfile.bio,
                skills: teenProfile.skills,
                hobbies: teenProfile.hobbies,
              }}
              action={updateTeenProfile}
            />
          </CardContent>
        </Card>
      </DashboardShell>
    );
  }

  const { data: employerProfile } = await supabase
    .from("employer_profiles")
    .select("display_name, bio")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!employerProfile) redirect(`/onboarding/${profile.role}`);

  return (
    <DashboardShell role={profile.role} email={profile.email}>
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            fields={{ kind: "employer", displayName: employerProfile.display_name, bio: employerProfile.bio }}
            action={updateEmployerProfile}
          />
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

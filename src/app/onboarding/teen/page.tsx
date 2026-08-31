import type { Metadata } from "next";

import { AuthCard } from "@/components/auth-card";
import { requireRole } from "@/lib/auth";
import { TeenOnboardingForm } from "./teen-onboarding-form";

export const metadata: Metadata = { title: "Set up your teen profile" };

export default async function TeenOnboardingPage() {
  await requireRole(["teen"]);

  return (
    <AuthCard title="Tell us about yourself" description="This helps employers find the right fit for you.">
      <TeenOnboardingForm />
    </AuthCard>
  );
}

import type { Metadata } from "next";

import { AuthCard } from "@/components/auth-card";
import { requireRole } from "@/lib/auth";
import { EmployerOnboardingForm } from "./employer-onboarding-form";

export const metadata: Metadata = { title: "Set up your employer profile" };

export default async function EmployerOnboardingPage() {
  await requireRole(["employer"]);

  return (
    <AuthCard title="Set up your employer profile" description="Teens will see this when they apply.">
      <EmployerOnboardingForm accountType="employer" />
    </AuthCard>
  );
}

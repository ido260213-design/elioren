import type { Metadata } from "next";

import { AuthCard } from "@/components/auth-card";
import { requireRole } from "@/lib/auth";
import { EmployerOnboardingForm } from "../employer/employer-onboarding-form";

export const metadata: Metadata = { title: "Set up your business profile" };

export default async function BusinessOnboardingPage() {
  await requireRole(["business"]);

  return (
    <AuthCard title="Set up your business profile" description="Teens will see this when they apply.">
      <EmployerOnboardingForm accountType="business" />
    </AuthCard>
  );
}

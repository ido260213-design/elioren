import type { Metadata } from "next";

import { AuthCard } from "@/components/auth-card";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <AuthCard title="Create your HireUp account" description="Pick the account type that fits you.">
      <SignupForm />
    </AuthCard>
  );
}

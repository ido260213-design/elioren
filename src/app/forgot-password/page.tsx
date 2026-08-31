import type { Metadata } from "next";

import { AuthCard } from "@/components/auth-card";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Reset your password" description="We'll email you a link to set a new one.">
      <ForgotPasswordForm />
    </AuthCard>
  );
}

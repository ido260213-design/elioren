import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthCard title="Welcome back" description="Log in to your HireUp account.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}

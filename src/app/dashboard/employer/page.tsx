import type { Metadata } from "next";

import { EmployerDashboard } from "./employer-dashboard";

export const metadata: Metadata = { title: "Employer dashboard" };

export default function EmployerDashboardPage() {
  return <EmployerDashboard accountType="employer" />;
}

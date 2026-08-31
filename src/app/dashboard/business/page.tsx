import type { Metadata } from "next";

import { EmployerDashboard } from "../employer/employer-dashboard";

export const metadata: Metadata = { title: "Business dashboard" };

export default function BusinessDashboardPage() {
  return <EmployerDashboard accountType="business" />;
}

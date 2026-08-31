import { redirect } from "next/navigation";

import { requireUser, dashboardPathForRole } from "@/lib/auth";

// Bare /dashboard has no role — send the visitor to the dashboard that's actually
// theirs, rather than 404ing (middleware only redirects /dashboard/<segment> paths
// away from the wrong role, it doesn't have a page to redirect *to* here).
export default async function DashboardIndexPage() {
  const { profile } = await requireUser();
  redirect(dashboardPathForRole(profile.role));
}

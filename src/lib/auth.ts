import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/database.types";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, email, created_at")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return { user, profile };
}

const ROLE_DASHBOARD_PATH: Record<UserRole, string> = {
  teen: "/dashboard/teen",
  employer: "/dashboard/employer",
  business: "/dashboard/business",
  admin: "/admin",
};

/** Require a signed-in user; redirect to /login if not. */
export async function requireUser() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  return session;
}

/** Require a signed-in user with one of `roles`; redirect to their own dashboard otherwise. */
export async function requireRole(roles: UserRole[]) {
  const session = await requireUser();
  if (!roles.includes(session.profile.role)) {
    redirect(ROLE_DASHBOARD_PATH[session.profile.role]);
  }
  return session;
}

export function dashboardPathForRole(role: UserRole) {
  return ROLE_DASHBOARD_PATH[role];
}

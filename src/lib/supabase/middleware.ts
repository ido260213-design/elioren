import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database, UserRole } from "./database.types";

const ROLE_DASHBOARD_PATH: Record<UserRole, string> = {
  teen: "/dashboard/teen",
  employer: "/dashboard/employer",
  business: "/dashboard/business",
  admin: "/admin",
};

const VALID_DASHBOARD_SEGMENTS = ["teen", "employer", "business"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not remove — this refreshes the session and must run before any
  // other Supabase call to keep cookies valid across requests.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAdminRoute = pathname.startsWith("/admin");
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isProtectedRoute = isDashboardRoute || isAdminRoute || isOnboardingRoute || pathname === "/profile" || pathname === "/applications";

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (isDashboardRoute || isAdminRoute)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    if (!role) {
      return supabaseResponse;
    }

    if (isAdminRoute && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_DASHBOARD_PATH[role];
      return NextResponse.redirect(url);
    }

    if (isDashboardRoute) {
      const segment = pathname.split("/")[2]; // /dashboard/<segment>

      if (VALID_DASHBOARD_SEGMENTS.includes(segment) && segment !== role) {
        const url = request.nextUrl.clone();
        url.pathname = ROLE_DASHBOARD_PATH[role];
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

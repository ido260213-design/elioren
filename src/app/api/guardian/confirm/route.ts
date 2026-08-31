import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

// Landed on from the link in the guardian-confirmation email. Uses the service-role
// client because the guardian isn't a signed-in HireUp user — RLS has no session to
// evaluate here, and the teen must never be able to write guardian_confirmed_at
// themselves (enforced in the DB by prevent_guardian_confirmation_tamper()), so this
// route is the *only* path that can set it.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${siteUrl}/guardian-confirmed?status=invalid`);
  }

  const supabase = createAdminClient();

  const { data: teenProfile, error: findError } = await supabase
    .from("teen_profiles")
    .select("user_id, guardian_confirmed_at")
    .eq("guardian_confirmation_token", token)
    .maybeSingle();

  if (findError || !teenProfile) {
    return NextResponse.redirect(`${siteUrl}/guardian-confirmed?status=invalid`);
  }

  if (!teenProfile.guardian_confirmed_at) {
    const { error: updateError } = await supabase
      .from("teen_profiles")
      .update({ guardian_confirmed_at: new Date().toISOString() })
      .eq("user_id", teenProfile.user_id);

    if (updateError) {
      return NextResponse.redirect(`${siteUrl}/guardian-confirmed?status=error`);
    }
  }

  return NextResponse.redirect(`${siteUrl}/guardian-confirmed?status=confirmed`);
}

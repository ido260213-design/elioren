import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// @supabase/ssr's server/browser clients default to the PKCE auth flow, which means
// every email link (signup confirmation, password reset) redirects back with a `?code=`
// param that must be exchanged for a real session server-side — the client never gets
// signed in on its own just by landing on the page. This route is that exchange point;
// every `redirectTo`/`emailRedirectTo` in the app should point here (with `next` set to
// the eventual destination), not straight at the destination page.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

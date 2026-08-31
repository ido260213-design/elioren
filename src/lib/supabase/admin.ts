import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

// Service-role client: bypasses RLS entirely. Never import this outside server-only
// code (route handlers, server actions) — the `server-only` import above makes any
// accidental client-bundle import a build error. Used for privileged operations the
// signed-in user isn't allowed to do themselves, e.g. writing guardian_confirmed_at
// once a guardian clicks their email confirmation link.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

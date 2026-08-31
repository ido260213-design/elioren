import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export const FREE_APPLICATIONS_PER_MONTH = 5;
export const FREE_ACTIVE_JOB_POSTS = 2;
export const PREMIUM_MONTHLY_PRICE_USD = 6.99;

export async function hasPremium(supabase: SupabaseClient<Database>, userId: string): Promise<boolean> {
  const { data } = await supabase.from("subscriptions").select("status").eq("user_id", userId).maybeSingle();
  return data?.status === "active";
}

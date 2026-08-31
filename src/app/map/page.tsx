import type { Metadata } from "next";

import { PublicHeader } from "@/components/public-header";
import { JobsMap } from "@/components/jobs-map";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nearby jobs" };

export default async function MapPage() {
  const supabase = await createClient();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, pay_type, pay_amount, lat, lng, employer_id")
    .eq("status", "open")
    .not("lat", "is", null)
    .not("lng", "is", null)
    .limit(200);

  const employerIds = [...new Set((jobs ?? []).map((j) => j.employer_id))];
  const { data: employers } = employerIds.length
    ? await supabase.from("employer_profiles").select("user_id, display_name").in("user_id", employerIds)
    : { data: [] };
  const employersById = new Map((employers ?? []).map((e) => [e.user_id, e]));

  const mapJobs = (jobs ?? [])
    .filter((j): j is typeof j & { lat: number; lng: number } => j.lat !== null && j.lng !== null)
    .map((j) => ({
      id: j.id,
      title: j.title,
      lat: j.lat,
      lng: j.lng,
      pay_type: j.pay_type,
      pay_amount: j.pay_amount,
      employer_display_name: employersById.get(j.employer_id)?.display_name,
    }));

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Nearby jobs</h1>
        {token ? (
          <JobsMap jobs={mapJobs} token={token} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Map view needs NEXT_PUBLIC_MAPBOX_TOKEN configured — see README.
          </p>
        )}
      </main>
    </div>
  );
}

import "server-only";

/**
 * Geocodes a free-text location into coordinates via the Mapbox Geocoding API.
 * Returns null (rather than throwing) when the token is missing or the lookup fails —
 * callers treat geocoding as best-effort, never blocking the job post itself.
 */
export async function geocodeLocation(locationText: string): Promise<{ lat: number; lng: number } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  try {
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationText)}.json`);
    url.searchParams.set("access_token", token);
    url.searchParams.set("limit", "1");

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json();
    const [lng, lat] = data?.features?.[0]?.center ?? [];
    if (typeof lat !== "number" || typeof lng !== "number") return null;

    return { lat, lng };
  } catch (error) {
    console.error("Mapbox geocoding failed", error);
    return null;
  }
}

import "server-only";

// Best-effort, in-memory, per-server-instance rate limiter. Good enough for a single
// Next.js server; a multi-instance deployment needs a shared store (e.g. Upstash Redis)
// instead — swap the implementation, keep the call sites the same.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

import type { NextRequest } from "next/server";

type Entry = { count: number; resetAt: number };

const BUCKETS = new Map<string, Entry>();
const MAX_KEYS = 10_000;

export interface RateResult {
  ok: boolean;
  retryAfterSec: number;
}

export function consumeRate(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();

  if (BUCKETS.size > MAX_KEYS) {
    for (const [k, v] of BUCKETS) {
      if (v.resetAt <= now) BUCKETS.delete(k);
      if (BUCKETS.size <= MAX_KEYS / 2) break;
    }
  }

  const entry = BUCKETS.get(key);
  if (!entry || entry.resetAt <= now) {
    BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (entry.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || "unknown";
}

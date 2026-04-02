/**
 * Simple in-memory rate limiter for API route protection.
 *
 * For production with multiple serverless instances, replace with
 * @upstash/ratelimit + @upstash/redis for distributed rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean stale entries every 60 seconds
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 60_000);
}

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSec: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  headers: Record<string, string>;
}

export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowSec * 1000 });
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      headers: {
        "X-RateLimit-Limit": String(config.maxRequests),
        "X-RateLimit-Remaining": String(config.maxRequests - 1),
      },
    };
  }

  entry.count++;

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const success = entry.count <= config.maxRequests;

  return {
    success,
    limit: config.maxRequests,
    remaining,
    headers: {
      "X-RateLimit-Limit": String(config.maxRequests),
      "X-RateLimit-Remaining": String(remaining),
      ...(success ? {} : { "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)) }),
    },
  };
}

/** Preset: auth endpoints — 10 requests per 15 minutes */
export const AUTH_LIMIT: RateLimitConfig = { maxRequests: 10, windowSec: 900 };

/** Preset: payment endpoints — 5 requests per minute */
export const PAYMENT_LIMIT: RateLimitConfig = { maxRequests: 5, windowSec: 60 };

/** Preset: general API — 60 requests per minute */
export const API_LIMIT: RateLimitConfig = { maxRequests: 60, windowSec: 60 };

/** Extract client identifier from request headers */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

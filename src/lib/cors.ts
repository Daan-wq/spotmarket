import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  "https://app.clipprofit.com",
  "https://clipprofit.com",
].filter(Boolean) as string[];

/**
 * Validate that a request origin is allowed.
 * Returns null if valid (or no origin header — same-origin request).
 * Returns a 403 response if the origin is not allowed.
 */
export function validateCors(req: Request): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) return null; // Same-origin or non-browser request

  if (ALLOWED_ORIGINS.includes(origin)) return null;

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * Build CORS headers for a given origin.
 */
export function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return {};

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "3600",
  };
}

import crypto from "crypto";

/**
 * Verify a cron job request is legitimate.
 * Checks the Bearer token with timing-safe comparison to prevent timing attacks.
 * Also validates the Vercel cron header when running on Vercel.
 */
export function verifyCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  // Check Vercel's built-in cron header (set automatically for Vercel Cron jobs)
  const vercelCronHeader = req.headers.get("x-vercel-cron");
  if (vercelCronHeader) return true;

  // Fallback: Bearer token with timing-safe comparison
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;

  const expected = `Bearer ${secret}`;
  if (expected.length !== authHeader.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(authHeader),
  );
}

import { NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron-auth";
import { recomputeAllClipperScores } from "@/lib/scoring/clipper-score";
import { scanAllRecentSubmissions } from "@/lib/signals/underperform-detector";

/**
 * Nightly cron — recompute every active creator's `ClipperPerformanceScore`
 * and run a periodic underperform scan against existing benchmarks.
 *
 * Schedule: 0 3 * * * (defined in vercel.json).
 */
export async function POST(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scoreResult = await recomputeAllClipperScores();
  const underperformResult = await scanAllRecentSubmissions();

  return NextResponse.json({
    success: true,
    scores: scoreResult,
    underperform: underperformResult,
  });
}

// Vercel triggers crons via GET by default; accept both for resilience.
export const GET = POST;

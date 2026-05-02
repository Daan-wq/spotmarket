/**
 * Cron: poll-metrics-hot
 *
 * Hot tier — submissions <24h old. Runs every 15 min (vercel.json).
 * Pulls fresh metrics via OAuth and emits submission.metrics.updated +
 * any submission.flagged events from the velocity scorer.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron-auth";
import { pollSubmissions } from "@/lib/metrics/poll-runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await pollSubmissions({ tier: "hot" });
  return NextResponse.json(result);
}

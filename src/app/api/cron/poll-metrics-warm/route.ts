/**
 * Cron: poll-metrics-warm
 *
 * Warm tier — submissions 1-7 days old, hourly cadence. Also folds in the
 * cold tier (>7d, <30d) once per cron run; cold rows have a 23h staleness
 * gate so they realistically refresh once per day.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron-auth";
import { pollSubmissions, type PollResult } from "@/lib/metrics/poll-runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const warm = await pollSubmissions({ tier: "warm" });
  const cold = await pollSubmissions({ tier: "cold" });
  const result: { warm: PollResult; cold: PollResult } = { warm, cold };
  return NextResponse.json(result);
}

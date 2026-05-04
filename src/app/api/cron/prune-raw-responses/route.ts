/**
 * Cron: prune-raw-responses
 *
 * Daily job that deletes RawApiResponse rows older than 90 days. Keeps the
 * raw-payload escape hatch bounded so the table doesn't grow indefinitely.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron-auth";
import { pruneRawApiResponses } from "@/lib/metrics/raw-storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RAW_RESPONSE_TTL_DAYS = 90;

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = await pruneRawApiResponses(RAW_RESPONSE_TTL_DAYS);
  return NextResponse.json({
    ok: true,
    ttlDays: RAW_RESPONSE_TTL_DAYS,
    deleted,
  });
}

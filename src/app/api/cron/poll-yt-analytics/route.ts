/**
 * Cron: poll-yt-analytics
 *
 * Daily snapshot of YouTube Channel Analytics for verified YT connections.
 * Persists `YtDailyChannelInsight` rows for the last 7 days (sliding window
 * to absorb Google's analytics backfill delays). Also captures the extra
 * dimensional breakdowns (traffic source, playback location, device type,
 * creatorContentType, subscribedStatus) for richer dashboarding.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { pollYtAnalyticsForConnection, type YtAnalyticsRunResult } from "@/lib/yt-analytics";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CONNECTION_LIMIT = 100;

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conns = await prisma.creatorYtConnection.findMany({
    where: { isVerified: true, accessToken: { not: null } },
    take: CONNECTION_LIMIT,
    orderBy: { updatedAt: "asc" },
  });

  const results: YtAnalyticsRunResult[] = [];
  for (const c of conns) {
    const r = await pollYtAnalyticsForConnection(c);
    results.push(r);
  }

  const totals = results.reduce(
    (acc, r) => ({
      ok: acc.ok + (r.ok ? 1 : 0),
      failed: acc.failed + (r.ok ? 0 : 1),
      rowsUpserted: acc.rowsUpserted + r.rowsUpserted,
    }),
    { ok: 0, failed: 0, rowsUpserted: 0 },
  );

  return NextResponse.json({ connections: conns.length, totals, results });
}

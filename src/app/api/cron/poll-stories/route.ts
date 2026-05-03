/**
 * Cron: poll-stories
 *
 * Hourly snapshot of every active Instagram Story for verified IG connections.
 * Stories live 24h via API → polling within the live window captures all
 * navigation and engagement metrics before expiry. Each upsert refreshes the
 * `StoryPost` row, so the final snapshot reflects the lifetime totals.
 *
 * Also kicks off reel correlation: when a story is captured, any IG reel
 * submission created within ±2h is linked via `StoryReelCorrelation` for
 * downstream "did the story boost the reel?" analysis.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { pollStoriesForConnection, type StorySnapshotResult } from "@/lib/stories";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CONNECTION_LIMIT = 100;

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conns = await prisma.creatorIgConnection.findMany({
    where: { isVerified: true, accessToken: { not: null } },
    take: CONNECTION_LIMIT,
    orderBy: { updatedAt: "asc" },
  });

  const results: StorySnapshotResult[] = [];
  for (const c of conns) {
    const r = await pollStoriesForConnection(c);
    results.push(r);
  }

  const totals = results.reduce(
    (acc, r) => ({
      fetched: acc.fetched + r.fetched,
      upserted: acc.upserted + r.upserted,
      failed: acc.failed + r.failed,
      correlations: acc.correlations + r.correlations,
    }),
    { fetched: 0, upserted: 0, failed: 0, correlations: 0 },
  );

  return NextResponse.json({
    connections: conns.length,
    totals,
    results,
  });
}

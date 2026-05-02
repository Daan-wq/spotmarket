/**
 * Cron: poll-demographics
 *
 * Daily refresh of audience demographics for every verified OAuth connection
 * (IG / TT / YT / FB). Writes AudienceSnapshot rows + emits
 * `submission.demographics.refreshed` events.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { publishEvent } from "@/lib/event-bus";
import {
  fetchIgAudience,
  fetchTtAudience,
  fetchYtAudience,
  fetchFbAudience,
  type AudienceFetchResult,
} from "@/lib/audience-fetcher";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PER_PLATFORM_LIMIT = 100;

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [ig, tt, yt, fb] = await Promise.all([
    refreshIg(),
    refreshTt(),
    refreshYt(),
    refreshFb(),
  ]);

  return NextResponse.json({ ig, tt, yt, fb });
}

interface PlatformResult {
  processed: number;
  succeeded: number;
  failed: number;
}

async function refreshIg(): Promise<PlatformResult> {
  const conns = await prisma.creatorIgConnection.findMany({
    where: { isVerified: true, accessToken: { not: null } },
    take: PER_PLATFORM_LIMIT,
    orderBy: { updatedAt: "asc" },
  });
  let succeeded = 0;
  let failed = 0;
  for (const c of conns) {
    const r = await fetchIgAudience(c);
    if (await persist(r, "IG", c.id)) succeeded++;
    else failed++;
  }
  return { processed: conns.length, succeeded, failed };
}

async function refreshTt(): Promise<PlatformResult> {
  const conns = await prisma.creatorTikTokConnection.findMany({
    where: { isVerified: true, accessToken: { not: null } },
    take: PER_PLATFORM_LIMIT,
    orderBy: { updatedAt: "asc" },
  });
  let succeeded = 0;
  let failed = 0;
  for (const c of conns) {
    const r = await fetchTtAudience(c);
    if (await persist(r, "TT", c.id)) succeeded++;
    else failed++;
  }
  return { processed: conns.length, succeeded, failed };
}

async function refreshYt(): Promise<PlatformResult> {
  const conns = await prisma.creatorYtConnection.findMany({
    where: { isVerified: true, accessToken: { not: null } },
    take: PER_PLATFORM_LIMIT,
    orderBy: { updatedAt: "asc" },
  });
  let succeeded = 0;
  let failed = 0;
  for (const c of conns) {
    const r = await fetchYtAudience(c);
    if (await persist(r, "YT", c.id)) succeeded++;
    else failed++;
  }
  return { processed: conns.length, succeeded, failed };
}

async function refreshFb(): Promise<PlatformResult> {
  const conns = await prisma.creatorFbConnection.findMany({
    where: { isVerified: true, accessToken: { not: null } },
    take: PER_PLATFORM_LIMIT,
    orderBy: { updatedAt: "asc" },
  });
  let succeeded = 0;
  let failed = 0;
  for (const c of conns) {
    const r = await fetchFbAudience(c);
    if (await persist(r, "FB", c.id)) succeeded++;
    else failed++;
  }
  return { processed: conns.length, succeeded, failed };
}

async function persist(
  result: AudienceFetchResult,
  type: "IG" | "TT" | "YT" | "FB",
  connectionId: string,
): Promise<boolean> {
  if (!result.ok || !result.audience) return false;

  const snap = await prisma.audienceSnapshot.create({
    data: {
      connectionType: type,
      connectionId,
      source: "PLATFORM_API",
      ageBuckets: result.audience.ageBuckets as Prisma.InputJsonValue,
      genderSplit: result.audience.genderSplit as Prisma.InputJsonValue,
      topCountries: result.audience.topCountries as unknown as Prisma.InputJsonValue,
      totalReach: result.audience.totalReach,
    },
    select: { id: true, capturedAt: true },
  });

  await publishEvent({
    type: "submission.demographics.refreshed",
    connectionId,
    connectionType: type,
    snapshotId: snap.id,
    occurredAt: snap.capturedAt.toISOString(),
  });
  return true;
}

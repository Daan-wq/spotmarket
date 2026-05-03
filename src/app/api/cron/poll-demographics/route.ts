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
import { recordRawApiResponse } from "@/lib/metrics/raw-storage";
import { Prisma, type AudienceKind } from "@prisma/client";

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
  if (!result.ok) return false;

  // Multi-variant flow (e.g. IG returns FOLLOWER + ENGAGED). Falls back to the
  // single `audience` field for platforms that only return one variant.
  const variants =
    result.variants && result.variants.length > 0
      ? result.variants
      : result.audience
        ? [{ kind: "FOLLOWER" as AudienceKind, audience: result.audience, raw: undefined }]
        : [];

  if (variants.length === 0) return false;

  for (const v of variants) {
    const snap = await prisma.audienceSnapshot.create({
      data: {
        connectionType: type,
        connectionId,
        source: "PLATFORM_API",
        kind: v.kind,
        ageBuckets: v.audience.ageBuckets as Prisma.InputJsonValue,
        genderSplit: v.audience.genderSplit as Prisma.InputJsonValue,
        topCountries: v.audience.topCountries as unknown as Prisma.InputJsonValue,
        cities:
          v.audience.cities == null
            ? Prisma.JsonNull
            : (v.audience.cities as Prisma.InputJsonValue),
        totalReach: v.audience.totalReach,
        raw: v.raw == null ? Prisma.JsonNull : (v.raw as Prisma.InputJsonValue),
      },
      select: { id: true, capturedAt: true },
    });

    if (v.raw != null) {
      await recordRawApiResponse({
        connectionType: type,
        connectionId,
        endpoint:
          v.kind === "ENGAGED"
            ? `${type.toLowerCase()}.user.demographics.engaged`
            : `${type.toLowerCase()}.user.demographics.followers`,
        payload: v.raw,
      });
    }

    await publishEvent({
      type: "submission.demographics.refreshed",
      connectionId,
      connectionType: type,
      snapshotId: snap.id,
      occurredAt: snap.capturedAt.toISOString(),
    });
  }

  return true;
}

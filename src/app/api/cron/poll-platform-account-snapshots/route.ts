/**
 * Cron: poll-platform-account-snapshots
 *
 * Daily account-state snapshot for every verified IG / FB / TT / YT
 * connection. Writes one `PlatformAccountSnapshot` row per connection per
 * day with follower count, video count, totalLikes (TikTok), etc. — letting
 * us reconstruct trend lines that the upserted connection rows would
 * otherwise destroy.
 *
 * Skips silently per-connection on platform errors so a single broken token
 * doesn't poison the whole run.
 */

import { NextRequest, NextResponse } from "next/server";
import type { ConnectionType } from "@prisma/client";
import { verifyCron } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import {
  recordAccountRefreshFailure,
  recordAccountRefreshSuccess,
} from "@/lib/social-account-refresh";

import { fetchInstagramProfile } from "@/lib/instagram";
import { fetchFacebookPageProfile } from "@/lib/facebook";
import { fetchTikTokProfile } from "@/lib/tiktok";
import { fetchChannelProfile } from "@/lib/youtube";
import {
  withFreshInstagramAccessToken,
  withFreshTikTokAccessToken,
  withFreshYoutubeAccessToken,
} from "@/lib/token-refresh";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CONNECTION_LIMIT = 100;

interface SnapshotInput {
  connectionType: ConnectionType;
  connectionId: string;
  audienceCount?: number | null;
  followingCount?: number | null;
  totalLikes?: bigint | null;
  videoCount?: number | null;
  isVerified?: boolean | null;
  raw?: unknown;
}

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [ig, fb, tt, yt] = await Promise.all([
    runIg(),
    runFb(),
    runTt(),
    runYt(),
  ]);
  return NextResponse.json({ ig, fb, tt, yt });
}

interface PlatformResult {
  processed: number;
  succeeded: number;
  failed: number;
}

async function runIg(): Promise<PlatformResult> {
  const conns = await prisma.creatorIgConnection.findMany({
    where: { isVerified: true, accessToken: { not: null } },
    take: CONNECTION_LIMIT,
    orderBy: { updatedAt: "asc" },
  });
  let s = 0;
  let f = 0;
  for (const c of conns) {
    try {
      if (!c.accessToken || !c.accessTokenIv || !c.igUserId) {
        await recordAccountRefreshFailure({
          connectionType: "IG",
          connectionId: c.id,
          error: new Error("Missing Instagram token or user id"),
          code: "MISSING_ACCOUNT_CREDENTIALS",
        }).catch(() => undefined);
        f++;
        continue;
      }
      const igUserId = c.igUserId;
      const profile = await withFreshInstagramAccessToken(c, (token) =>
        fetchInstagramProfile(token, igUserId),
      );
      if (!profile) {
        await recordAccountRefreshFailure({
          connectionType: "IG",
          connectionId: c.id,
          error: new Error("Could not refresh Instagram access token"),
          code: "TOKEN_REFRESH_FAILED",
        }).catch(() => undefined);
        f++;
        continue;
      }
      await persist({
        connectionType: "IG",
        connectionId: c.id,
        audienceCount: profile.followersCount ?? null,
        followingCount: profile.followsCount ?? null,
        videoCount: profile.mediaCount ?? null,
        raw: profile,
      });
      s++;
    } catch (err) {
      console.warn(`[account-snap] IG ${c.id}: ${(err as Error).message}`);
      await recordAccountRefreshFailure({ connectionType: "IG", connectionId: c.id, error: err }).catch(() => undefined);
      f++;
    }
  }
  return { processed: conns.length, succeeded: s, failed: f };
}

async function runFb(): Promise<PlatformResult> {
  const conns = await prisma.creatorFbConnection.findMany({
    where: { isVerified: true, accessToken: { not: null } },
    take: CONNECTION_LIMIT,
    orderBy: { updatedAt: "asc" },
  });
  let s = 0;
  let f = 0;
  for (const c of conns) {
    try {
      if (!c.accessToken || !c.accessTokenIv || !c.fbPageId) {
        await recordAccountRefreshFailure({
          connectionType: "FB",
          connectionId: c.id,
          error: new Error("Missing Facebook token or page id"),
          code: "MISSING_ACCOUNT_CREDENTIALS",
        }).catch(() => undefined);
        f++;
        continue;
      }
      const token = decrypt(c.accessToken, c.accessTokenIv);
      const profile = await fetchFacebookPageProfile(c.fbPageId, token);
      await persist({
        connectionType: "FB",
        connectionId: c.id,
        audienceCount: profile.followerCount ?? null,
        raw: profile,
      });
      s++;
    } catch (err) {
      console.warn(`[account-snap] FB ${c.id}: ${(err as Error).message}`);
      await recordAccountRefreshFailure({ connectionType: "FB", connectionId: c.id, error: err }).catch(() => undefined);
      f++;
    }
  }
  return { processed: conns.length, succeeded: s, failed: f };
}

async function runTt(): Promise<PlatformResult> {
  const conns = await prisma.creatorTikTokConnection.findMany({
    where: { isVerified: true, accessToken: { not: null } },
    take: CONNECTION_LIMIT,
    orderBy: { updatedAt: "asc" },
  });
  let s = 0;
  let f = 0;
  for (const c of conns) {
    try {
      const profile = await withFreshTikTokAccessToken(c, (token) =>
        fetchTikTokProfile(token),
      ).catch(() => null);
      if (!profile) {
        await recordAccountRefreshFailure({
          connectionType: "TT",
          connectionId: c.id,
          error: new Error("Could not refresh TikTok access token"),
          code: "TOKEN_REFRESH_FAILED",
        }).catch(() => undefined);
        f++;
        continue;
      }
      await persist({
        connectionType: "TT",
        connectionId: c.id,
        audienceCount: profile.followerCount,
        followingCount: profile.followingCount,
        videoCount: profile.videoCount,
        totalLikes: profile.likesCount != null ? BigInt(profile.likesCount) : null,
        isVerified: profile.isVerified ?? null,
        raw: profile,
      });
      s++;
    } catch (err) {
      console.warn(`[account-snap] TT ${c.id}: ${(err as Error).message}`);
      await recordAccountRefreshFailure({ connectionType: "TT", connectionId: c.id, error: err }).catch(() => undefined);
      f++;
    }
  }
  return { processed: conns.length, succeeded: s, failed: f };
}

async function runYt(): Promise<PlatformResult> {
  const conns = await prisma.creatorYtConnection.findMany({
    where: { isVerified: true, accessToken: { not: null } },
    take: CONNECTION_LIMIT,
    orderBy: { updatedAt: "asc" },
  });
  let s = 0;
  let f = 0;
  for (const c of conns) {
    try {
      const profile = await withFreshYoutubeAccessToken(c, (token) =>
        fetchChannelProfile(token),
      ).catch(() => null);
      if (!profile) {
        await recordAccountRefreshFailure({
          connectionType: "YT",
          connectionId: c.id,
          error: new Error("Could not refresh YouTube access token"),
          code: "TOKEN_REFRESH_FAILED",
        }).catch(() => undefined);
        f++;
        continue;
      }
      await persist({
        connectionType: "YT",
        connectionId: c.id,
        audienceCount: profile.subscriberCount ?? null,
        videoCount: profile.videoCount ?? null,
        raw: profile,
      });
      s++;
    } catch (err) {
      console.warn(`[account-snap] YT ${c.id}: ${(err as Error).message}`);
      await recordAccountRefreshFailure({ connectionType: "YT", connectionId: c.id, error: err }).catch(() => undefined);
      f++;
    }
  }
  return { processed: conns.length, succeeded: s, failed: f };
}

async function persist(input: SnapshotInput): Promise<void> {
  await recordAccountRefreshSuccess({
    connectionType: input.connectionType,
    connectionId: input.connectionId,
    audienceCount: input.audienceCount ?? null,
    followingCount: input.followingCount ?? null,
    totalLikes: input.totalLikes ?? null,
    videoCount: input.videoCount ?? null,
    isVerified: input.isVerified ?? null,
    raw: input.raw,
  });
}

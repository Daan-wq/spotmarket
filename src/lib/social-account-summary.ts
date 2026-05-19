import type { AccountRefreshStatus, ConnectionType, PlatformAccountSnapshot } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLATFORM_ALL, type PlatformSlug, slugToConnectionType } from "@/lib/stats/types";

export interface SocialAccountSummary {
  platform: PlatformSlug;
  connectionType: ConnectionType;
  id: string;
  creatorProfileId: string;
  label: string;
  handle: string | null;
  matchHandle: string;
  audienceCount: number | null;
  countLabel: "followers" | "subscribers";
  isVerified: boolean;
  tokenExpiresAt: Date | null;
  accountRefreshStatus: AccountRefreshStatus;
  lastRefreshAttemptAt: Date | null;
  lastSuccessfulRefreshAt: Date | null;
  lastRefreshFailedAt: Date | null;
  lastRefreshErrorCode: string | null;
  lastRefreshErrorMessage: string | null;
}

export type SocialAccountsByPlatform = Record<PlatformSlug, SocialAccountSummary[]>;

type SnapshotPick = Pick<
  PlatformAccountSnapshot,
  "connectionType" | "connectionId" | "audienceCount" | "capturedAt"
>;

export async function getSocialAccountSummariesForProfile(
  creatorProfileId: string,
): Promise<SocialAccountsByPlatform> {
  const [ig, fb, yt, tt] = await Promise.all([
    prisma.creatorIgConnection.findMany({ where: { creatorProfileId }, orderBy: { createdAt: "desc" } }),
    prisma.creatorFbConnection.findMany({ where: { creatorProfileId }, orderBy: { createdAt: "desc" } }),
    prisma.creatorYtConnection.findMany({ where: { creatorProfileId }, orderBy: { createdAt: "desc" } }),
    prisma.creatorTikTokConnection.findMany({ where: { creatorProfileId }, orderBy: { createdAt: "desc" } }),
  ]);

  const base: SocialAccountsByPlatform = {
    ig: ig.map((c) => ({
      platform: "ig",
      connectionType: "IG",
      id: c.id,
      creatorProfileId: c.creatorProfileId,
      label: `@${stripAt(c.igUsername)}`,
      handle: `@${stripAt(c.igUsername)}`,
      matchHandle: stripAt(c.igUsername),
      audienceCount: null,
      countLabel: "followers",
      isVerified: c.isVerified,
      tokenExpiresAt: c.tokenExpiresAt,
      accountRefreshStatus: c.accountRefreshStatus,
      lastRefreshAttemptAt: c.lastRefreshAttemptAt,
      lastSuccessfulRefreshAt: c.lastSuccessfulRefreshAt,
      lastRefreshFailedAt: c.lastRefreshFailedAt,
      lastRefreshErrorCode: c.lastRefreshErrorCode,
      lastRefreshErrorMessage: c.lastRefreshErrorMessage,
    })),
    tt: tt.map((c) => ({
      platform: "tt",
      connectionType: "TT",
      id: c.id,
      creatorProfileId: c.creatorProfileId,
      label: `@${stripAt(c.username)}`,
      handle: `@${stripAt(c.username)}`,
      matchHandle: stripAt(c.username),
      audienceCount: null,
      countLabel: "followers",
      isVerified: c.isVerified,
      tokenExpiresAt: c.tokenExpiresAt,
      accountRefreshStatus: c.accountRefreshStatus,
      lastRefreshAttemptAt: c.lastRefreshAttemptAt,
      lastSuccessfulRefreshAt: c.lastSuccessfulRefreshAt,
      lastRefreshFailedAt: c.lastRefreshFailedAt,
      lastRefreshErrorCode: c.lastRefreshErrorCode,
      lastRefreshErrorMessage: c.lastRefreshErrorMessage,
    })),
    yt: yt.map((c) => ({
      platform: "yt",
      connectionType: "YT",
      id: c.id,
      creatorProfileId: c.creatorProfileId,
      label: c.channelName,
      handle: c.channelName,
      matchHandle: c.channelName,
      audienceCount: null,
      countLabel: "subscribers",
      isVerified: c.isVerified,
      tokenExpiresAt: c.tokenExpiresAt,
      accountRefreshStatus: c.accountRefreshStatus,
      lastRefreshAttemptAt: c.lastRefreshAttemptAt,
      lastSuccessfulRefreshAt: c.lastSuccessfulRefreshAt,
      lastRefreshFailedAt: c.lastRefreshFailedAt,
      lastRefreshErrorCode: c.lastRefreshErrorCode,
      lastRefreshErrorMessage: c.lastRefreshErrorMessage,
    })),
    fb: fb.map((c) => ({
      platform: "fb",
      connectionType: "FB",
      id: c.id,
      creatorProfileId: c.creatorProfileId,
      label: c.pageName,
      handle: c.pageHandle ? `@${stripAt(c.pageHandle)}` : null,
      matchHandle: c.pageHandle ?? c.pageName,
      audienceCount: null,
      countLabel: "followers",
      isVerified: c.isVerified,
      tokenExpiresAt: c.tokenExpiresAt,
      accountRefreshStatus: c.accountRefreshStatus,
      lastRefreshAttemptAt: c.lastRefreshAttemptAt,
      lastSuccessfulRefreshAt: c.lastSuccessfulRefreshAt,
      lastRefreshFailedAt: c.lastRefreshFailedAt,
      lastRefreshErrorCode: c.lastRefreshErrorCode,
      lastRefreshErrorMessage: c.lastRefreshErrorMessage,
    })),
  };

  const flattened = PLATFORM_ALL.flatMap((platform) => base[platform]);
  const snapshots = await getLatestAccountSnapshots(flattened);
  const merged = applyLatestAccountSnapshots(flattened, snapshots);
  return {
    ig: merged.filter((a) => a.platform === "ig"),
    tt: merged.filter((a) => a.platform === "tt"),
    yt: merged.filter((a) => a.platform === "yt"),
    fb: merged.filter((a) => a.platform === "fb"),
  };
}

export async function getSocialAccountSummary(
  creatorProfileId: string,
  platform: PlatformSlug,
  connectionId: string,
): Promise<SocialAccountSummary | null> {
  const accounts = await getSocialAccountSummariesForProfile(creatorProfileId);
  return accounts[platform].find((account) => account.id === connectionId) ?? null;
}

export async function getLatestAudienceCountByPlatform(
  creatorProfileId: string,
): Promise<Record<PlatformSlug, number>> {
  const accounts = await getSocialAccountSummariesForProfile(creatorProfileId);
  return {
    ig: sumAudience(accounts.ig),
    tt: sumAudience(accounts.tt),
    yt: sumAudience(accounts.yt),
    fb: sumAudience(accounts.fb),
  };
}

export function applyLatestAccountSnapshots(
  accounts: SocialAccountSummary[],
  snapshots: SnapshotPick[],
): SocialAccountSummary[] {
  const byConnection = new Map<string, SnapshotPick>();
  for (const snapshot of snapshots) {
    const key = accountKey(snapshot.connectionType, snapshot.connectionId);
    const current = byConnection.get(key);
    if (!current || snapshot.capturedAt > current.capturedAt) {
      byConnection.set(key, snapshot);
    }
  }
  return accounts.map((account) => ({
    ...account,
    audienceCount: byConnection.get(accountKey(account.connectionType, account.id))?.audienceCount ?? null,
  }));
}

async function getLatestAccountSnapshots(
  accounts: SocialAccountSummary[],
): Promise<SnapshotPick[]> {
  const snapshots = await Promise.all(
    PLATFORM_ALL.map((platform) => {
      const ids = accounts.filter((account) => account.platform === platform).map((account) => account.id);
      if (ids.length === 0) return Promise.resolve([] as SnapshotPick[]);
      return prisma.platformAccountSnapshot.findMany({
        where: {
          connectionType: slugToConnectionType(platform),
          connectionId: { in: ids },
        },
        orderBy: { capturedAt: "desc" },
        distinct: ["connectionId"],
        select: {
          connectionType: true,
          connectionId: true,
          audienceCount: true,
          capturedAt: true,
        },
      });
    }),
  );
  return snapshots.flat();
}

function stripAt(value: string): string {
  return value.replace(/^@/, "");
}

function sumAudience(accounts: SocialAccountSummary[]): number {
  return accounts.reduce((sum, account) => sum + (account.audienceCount ?? 0), 0);
}

function accountKey(connectionType: ConnectionType, connectionId: string): string {
  return `${connectionType}:${connectionId}`;
}

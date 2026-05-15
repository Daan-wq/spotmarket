import type { Platform } from "@prisma/client";

export type JoinPlatform = Platform;

export interface VerifiedPlatformConnections {
  instagram?: boolean;
  tiktok?: boolean;
  youtube?: boolean;
  facebook?: boolean;
}

export interface CampaignPlatformEligibility {
  eligible: boolean;
  hasAnyVerifiedSupportedAccount: boolean;
  matchedPlatforms: JoinPlatform[];
  missingPlatforms: JoinPlatform[];
  requiredPlatforms: JoinPlatform[];
  requiredPlatformLabels: string[];
  missingPlatformLabels: string[];
}

const SUPPORTED_JOIN_PLATFORMS = [
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE_SHORTS",
  "FACEBOOK",
] as const satisfies readonly JoinPlatform[];

const PLATFORM_META: Record<
  JoinPlatform,
  { label: string; connectionKey?: keyof VerifiedPlatformConnections }
> = {
  INSTAGRAM: { label: "Instagram", connectionKey: "instagram" },
  TIKTOK: { label: "TikTok", connectionKey: "tiktok" },
  YOUTUBE_SHORTS: { label: "YouTube", connectionKey: "youtube" },
  FACEBOOK: { label: "Facebook", connectionKey: "facebook" },
  X: { label: "X" },
};

export function evaluateCampaignJoinEligibility(
  campaignPlatforms: readonly Platform[],
  connections: VerifiedPlatformConnections,
): CampaignPlatformEligibility {
  const requiredPlatforms = getRequiredJoinPlatforms(campaignPlatforms);
  const matchedPlatforms = requiredPlatforms.filter((platform) =>
    isPlatformVerified(platform, connections),
  );
  const missingPlatforms = requiredPlatforms.filter(
    (platform) => !isPlatformVerified(platform, connections),
  );

  const hasAnyVerifiedSupportedAccount = SUPPORTED_JOIN_PLATFORMS.some(
    (platform) => isPlatformVerified(platform, connections),
  );

  return {
    eligible: matchedPlatforms.length > 0,
    hasAnyVerifiedSupportedAccount,
    matchedPlatforms,
    missingPlatforms,
    requiredPlatforms,
    requiredPlatformLabels: requiredPlatforms.map(platformLabel),
    missingPlatformLabels: missingPlatforms.map(platformLabel),
  };
}

export function buildConnectRequiredMessage(labels: readonly string[]): string {
  const platformList = formatPlatformList(labels);
  const accountWord = labels.length === 1 ? "account" : "accounts";
  return `Connect your ${platformList} ${accountWord} to join this campaign.`;
}

export function formatPlatformList(labels: readonly string[]): string {
  if (labels.length === 0) return "social";
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]} or ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, or ${labels[labels.length - 1]}`;
}

export function platformLabel(platform: JoinPlatform): string {
  return PLATFORM_META[platform].label;
}

function getRequiredJoinPlatforms(
  campaignPlatforms: readonly Platform[],
): JoinPlatform[] {
  if (campaignPlatforms.length === 0) {
    return [...SUPPORTED_JOIN_PLATFORMS];
  }

  return Array.from(new Set(campaignPlatforms));
}

function isPlatformVerified(
  platform: JoinPlatform,
  connections: VerifiedPlatformConnections,
): boolean {
  const connectionKey = PLATFORM_META[platform].connectionKey;
  return connectionKey ? Boolean(connections[connectionKey]) : false;
}

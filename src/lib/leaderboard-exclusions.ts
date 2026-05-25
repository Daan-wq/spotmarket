export const LEADERBOARD_OVERSCAN_LIMIT = 25;

const EXCLUDED_LEADERBOARD_HANDLES = new Set(["daans03"]);

export interface LeaderboardIdentity {
  email?: string | null;
  discordUsername?: string | null;
  creatorProfile?: {
    username?: string | null;
    displayName?: string | null;
  } | null;
}

export function isExcludedFromLeaderboards(
  identity: LeaderboardIdentity | null | undefined,
): boolean {
  if (!identity) return false;

  const emailLocalPart = identity.email?.split("@")[0];
  return [
    identity.discordUsername,
    identity.creatorProfile?.username,
    identity.creatorProfile?.displayName,
    emailLocalPart,
  ].some((value) => EXCLUDED_LEADERBOARD_HANDLES.has(normalizeHandle(value)));
}

function normalizeHandle(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/^@+/, "").toLowerCase();
}

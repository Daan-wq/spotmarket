export interface CreatorLeaderboardNameSource {
  email?: string | null;
  discordUsername?: string | null;
  creatorProfile?: {
    username?: string | null;
  } | null;
}

function cleanName(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function resolveCreatorLeaderboardName(
  creator: CreatorLeaderboardNameSource | null | undefined,
): string | null {
  return (
    cleanName(creator?.discordUsername) ??
    cleanName(creator?.creatorProfile?.username) ??
    cleanName(creator?.email)
  );
}

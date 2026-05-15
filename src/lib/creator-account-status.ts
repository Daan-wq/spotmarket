export interface CreatorVerifiedPlatformState {
  instagram?: boolean;
  tiktok?: boolean;
  youtube?: boolean;
  facebook?: boolean;
}

const PLATFORM_LABELS = [
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
  ["facebook", "Facebook"],
] as const satisfies readonly [
  keyof CreatorVerifiedPlatformState,
  string,
][];

export function getVerifiedCreatorPlatformLabels(
  state: CreatorVerifiedPlatformState,
): string[] {
  return PLATFORM_LABELS.filter(([key]) => state[key]).map(([, label]) => label);
}

export function hasVerifiedCreatorPlatform(
  state: CreatorVerifiedPlatformState,
): boolean {
  return getVerifiedCreatorPlatformLabels(state).length > 0;
}

export function getCreatorAccountStatusCopy(
  state: CreatorVerifiedPlatformState,
): { value: string; detail: string } {
  const labels = getVerifiedCreatorPlatformLabels(state);
  if (labels.length === 0) {
    return {
      value: "No verified accounts",
      detail: "Connect a social account to join campaigns.",
    };
  }

  const accountWord = labels.length === 1 ? "account" : "accounts";
  return {
    value: `${labels.length} verified ${accountWord}`,
    detail: `${formatAndList(labels)} ready for campaigns.`,
  };
}

function formatAndList(labels: readonly string[]): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

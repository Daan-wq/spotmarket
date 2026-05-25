import { buildAppUrl, getAppUrlForLocale } from "@/lib/app-url";
import { normalizeReferralCode } from "@/lib/referral";

export const CLIPPROFIT_CAMPAIGN_SLUG = "clipprofit";
export const CLIPPROFIT_BIO_REQUIREMENT =
  "Plaats je persoonlijke ClipProfit-link in je bio.";

export function normalizeCampaignSlug(value: string | null | undefined) {
  const slug = value?.trim().toLowerCase();
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return undefined;
  return slug;
}

export function buildCampaignReferralPath(
  campaignSlug: string,
  referralCode: string,
) {
  const slug = normalizeCampaignSlug(campaignSlug);
  const code = normalizeReferralCode(referralCode);

  if (!slug || !code) {
    throw new Error("Campaign slug and referral code are required.");
  }

  return `/c/${encodeURIComponent(slug)}/${encodeURIComponent(code)}`;
}

export function buildCampaignReferralUrl(
  campaignSlug: string,
  referralCode: string,
  baseUrl = getAppUrlForLocale(),
) {
  return buildAppUrl(
    buildCampaignReferralPath(campaignSlug, referralCode),
    baseUrl,
  );
}

export interface CampaignReferralReportAttribution {
  referrerId: string;
  referrerLabel: string;
  referredUserId: string | null;
  clickedAt?: Date | string | null;
  signedUpAt?: Date | string | null;
  onboardedAt: Date | string | null;
  discordLinkedAt?: Date | string | null;
  socialConnectedAt?: Date | string | null;
  firstSubmissionAt: Date | string | null;
  activeAt: Date | string | null;
  earnedAmount: number;
}

export type CampaignReferralBucket =
  | "clicked_only"
  | "inactive_invite"
  | "active_invite";

export interface CampaignReferralReportReferrerRow {
  referrerId: string;
  referrerLabel: string;
  clicks: number;
  signupStartedCount: number;
  clickedOnlyCount: number;
  inviteCount: number;
  activeClipperCount: number;
  inactiveClipperCount: number;
  firstSubmissions: number;
  approvedClipperCount: number;
  totalEarnedByInvitedClippers: number;
  activationRate: number;
  lastActivityAt: Date | string | null;
}

export interface CampaignReferralReport {
  totalClicks: number;
  signupStartedCount: number;
  clickedOnlyCount: number;
  inviteCount: number;
  activeClipperCount: number;
  inactiveClipperCount: number;
  firstSubmissions: number;
  approvedClipperCount: number;
  totalEarnedByInvitedClippers: number;
  activationRate: number;
  cpaPerInvite: number | null;
  cpaPerActiveClipper: number | null;
  referrers: CampaignReferralReportReferrerRow[];
}

export function getCampaignReferralBucket(
  attribution: Pick<
    CampaignReferralReportAttribution,
    "onboardedAt" | "firstSubmissionAt"
  >,
): CampaignReferralBucket {
  if (attribution.onboardedAt && attribution.firstSubmissionAt) {
    return "active_invite";
  }

  if (attribution.onboardedAt) {
    return "inactive_invite";
  }

  return "clicked_only";
}

function latestDate(
  current: Date | string | null,
  next: Date | string | null | undefined,
) {
  if (!next) return current;
  if (!current) return next;

  return new Date(next).getTime() > new Date(current).getTime()
    ? next
    : current;
}

export function calculateCampaignReferralReport({
  totalBudget,
  attributions,
}: {
  totalBudget: number;
  attributions: CampaignReferralReportAttribution[];
}): CampaignReferralReport {
  const invitedUsers = new Set<string>();
  const activeUsers = new Set<string>();
  const approvedUsers = new Set<string>();
  let signupStartedCount = 0;
  let clickedOnlyCount = 0;
  let firstSubmissions = 0;
  let totalEarnedByInvitedClippers = 0;

  const rows = new Map<
    string,
    CampaignReferralReportReferrerRow & {
      invitedUsers: Set<string>;
      activeUsers: Set<string>;
      approvedUsers: Set<string>;
    }
  >();

  for (const attribution of attributions) {
    const row =
      rows.get(attribution.referrerId) ??
      {
        referrerId: attribution.referrerId,
        referrerLabel: attribution.referrerLabel,
        clicks: 0,
        signupStartedCount: 0,
        clickedOnlyCount: 0,
        inviteCount: 0,
        activeClipperCount: 0,
        inactiveClipperCount: 0,
        firstSubmissions: 0,
        approvedClipperCount: 0,
        totalEarnedByInvitedClippers: 0,
        activationRate: 0,
        lastActivityAt: null,
        invitedUsers: new Set<string>(),
        activeUsers: new Set<string>(),
        approvedUsers: new Set<string>(),
      };

    row.clicks += 1;
    row.lastActivityAt = [
      attribution.clickedAt,
      attribution.signedUpAt,
      attribution.onboardedAt,
      attribution.discordLinkedAt,
      attribution.socialConnectedAt,
      attribution.firstSubmissionAt,
      attribution.activeAt,
    ].reduce(latestDate, row.lastActivityAt);

    const bucket = getCampaignReferralBucket(attribution);
    if (bucket === "clicked_only") {
      clickedOnlyCount += 1;
      row.clickedOnlyCount += 1;
    }

    if (attribution.signedUpAt) {
      signupStartedCount += 1;
      row.signupStartedCount += 1;
    }

    if (attribution.referredUserId && attribution.onboardedAt) {
      invitedUsers.add(attribution.referredUserId);
      row.invitedUsers.add(attribution.referredUserId);
    }

    if (attribution.referredUserId && attribution.onboardedAt && attribution.firstSubmissionAt) {
      firstSubmissions += 1;
      row.firstSubmissions += 1;
      activeUsers.add(attribution.referredUserId);
      row.activeUsers.add(attribution.referredUserId);
    }

    if (attribution.referredUserId && attribution.activeAt) {
      approvedUsers.add(attribution.referredUserId);
      row.approvedUsers.add(attribution.referredUserId);
    }

    if (attribution.referredUserId && attribution.onboardedAt) {
      row.totalEarnedByInvitedClippers += attribution.earnedAmount;
      totalEarnedByInvitedClippers += attribution.earnedAmount;
    }
    rows.set(attribution.referrerId, row);
  }

  const inviteCount = invitedUsers.size;
  const activeClipperCount = activeUsers.size;
  const inactiveClipperCount = Math.max(inviteCount - activeClipperCount, 0);
  const approvedClipperCount = approvedUsers.size;

  return {
    totalClicks: attributions.length,
    signupStartedCount,
    clickedOnlyCount,
    inviteCount,
    activeClipperCount,
    inactiveClipperCount,
    firstSubmissions,
    approvedClipperCount,
    totalEarnedByInvitedClippers,
    activationRate: inviteCount > 0 ? activeClipperCount / inviteCount : 0,
    cpaPerInvite: inviteCount > 0 ? totalBudget / inviteCount : null,
    cpaPerActiveClipper:
      activeClipperCount > 0 ? totalBudget / activeClipperCount : null,
    referrers: Array.from(rows.values())
      .map(
        ({
          invitedUsers: rowInvites,
          activeUsers: rowActives,
          approvedUsers: rowApproved,
          ...row
        }) => {
          const rowInviteCount = rowInvites.size;
          const rowActiveClipperCount = rowActives.size;

          return {
            ...row,
            inviteCount: rowInviteCount,
            activeClipperCount: rowActiveClipperCount,
            inactiveClipperCount: Math.max(
              rowInviteCount - rowActiveClipperCount,
              0,
            ),
            approvedClipperCount: rowApproved.size,
            activationRate:
              rowInviteCount > 0
                ? rowActiveClipperCount / rowInviteCount
                : 0,
          };
        },
      )
      .sort(
        (a, b) =>
          b.activeClipperCount - a.activeClipperCount ||
          b.inviteCount - a.inviteCount ||
          b.clicks - a.clicks,
      ),
  };
}

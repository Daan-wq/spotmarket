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
  onboardedAt: Date | string | null;
  firstSubmissionAt: Date | string | null;
  activeAt: Date | string | null;
  earnedAmount: number;
}

export interface CampaignReferralReportReferrerRow {
  referrerId: string;
  referrerLabel: string;
  clicks: number;
  inviteCount: number;
  activeClipperCount: number;
  firstSubmissions: number;
  totalEarnedByInvitedClippers: number;
}

export interface CampaignReferralReport {
  totalClicks: number;
  inviteCount: number;
  activeClipperCount: number;
  firstSubmissions: number;
  totalEarnedByInvitedClippers: number;
  activationRate: number;
  cpaPerInvite: number | null;
  cpaPerActiveClipper: number | null;
  referrers: CampaignReferralReportReferrerRow[];
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
  let firstSubmissions = 0;
  let totalEarnedByInvitedClippers = 0;

  const rows = new Map<
    string,
    CampaignReferralReportReferrerRow & {
      invitedUsers: Set<string>;
      activeUsers: Set<string>;
    }
  >();

  for (const attribution of attributions) {
    const row =
      rows.get(attribution.referrerId) ??
      {
        referrerId: attribution.referrerId,
        referrerLabel: attribution.referrerLabel,
        clicks: 0,
        inviteCount: 0,
        activeClipperCount: 0,
        firstSubmissions: 0,
        totalEarnedByInvitedClippers: 0,
        invitedUsers: new Set<string>(),
        activeUsers: new Set<string>(),
      };

    row.clicks += 1;

    if (attribution.referredUserId && attribution.onboardedAt) {
      invitedUsers.add(attribution.referredUserId);
      row.invitedUsers.add(attribution.referredUserId);
    }

    if (attribution.firstSubmissionAt) {
      firstSubmissions += 1;
      row.firstSubmissions += 1;
    }

    if (attribution.referredUserId && attribution.activeAt) {
      activeUsers.add(attribution.referredUserId);
      row.activeUsers.add(attribution.referredUserId);
    }

    row.totalEarnedByInvitedClippers += attribution.earnedAmount;
    totalEarnedByInvitedClippers += attribution.earnedAmount;
    rows.set(attribution.referrerId, row);
  }

  const inviteCount = invitedUsers.size;
  const activeClipperCount = activeUsers.size;

  return {
    totalClicks: attributions.length,
    inviteCount,
    activeClipperCount,
    firstSubmissions,
    totalEarnedByInvitedClippers,
    activationRate: inviteCount > 0 ? activeClipperCount / inviteCount : 0,
    cpaPerInvite: inviteCount > 0 ? totalBudget / inviteCount : null,
    cpaPerActiveClipper:
      activeClipperCount > 0 ? totalBudget / activeClipperCount : null,
    referrers: Array.from(rows.values())
      .map(({ invitedUsers: rowInvites, activeUsers: rowActives, ...row }) => ({
        ...row,
        inviteCount: rowInvites.size,
        activeClipperCount: rowActives.size,
      }))
      .sort(
        (a, b) =>
          b.activeClipperCount - a.activeClipperCount ||
          b.inviteCount - a.inviteCount ||
          b.clicks - a.clicks,
      ),
  };
}

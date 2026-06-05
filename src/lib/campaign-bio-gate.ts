import type {
  Campaign,
  CampaignApplicationConnectionStatus,
  ConnectionType,
  Platform,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { fetchFacebookPageProfile } from "@/lib/facebook";
import { fetchInstagramProfile } from "@/lib/instagram";
import { fetchTikTokProfile } from "@/lib/tiktok";
import { getFreshTikTokAccessToken, getFreshYoutubeAccessToken } from "@/lib/token-refresh";
import { fetchChannelProfile } from "@/lib/youtube";
import {
  getSocialAccountSummariesForProfile,
  type SocialAccountSummary,
} from "@/lib/social-account-summary";
import { connectionTypeToSlug, type PlatformSlug } from "@/lib/stats/types";

export interface SelectedCampaignAccount {
  connectionType: ConnectionType;
  connectionId: string;
}

export interface CampaignBioAccountOption {
  connectionType: ConnectionType;
  connectionId: string;
  platform: PlatformSlug;
  label: string;
  handle: string | null;
  audienceCount: number | null;
  isVerified: boolean;
}

export interface CampaignBioVerificationResult extends CampaignBioAccountOption {
  status: CampaignApplicationConnectionStatus;
  missingKeywords: string[];
  failureReason: string | null;
}

type CampaignBioConfig = Pick<Campaign, "requiresApproval" | "bioKeywords" | "platforms">;

const PLATFORM_TO_CONNECTION_TYPE: Partial<Record<Platform, ConnectionType>> = {
  INSTAGRAM: "IG",
  TIKTOK: "TT",
  YOUTUBE_SHORTS: "YT",
  FACEBOOK: "FB",
};

export function normalizeBioKeywords(keywords: readonly string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const keyword of keywords ?? []) {
    const trimmed = keyword.trim();
    if (!trimmed) continue;
    const key = normalizeBioText(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);
  }
  return normalized;
}

export function campaignRequiresBioGate(campaign: Pick<Campaign, "requiresApproval">): boolean {
  return campaign.requiresApproval;
}

export function campaignBioGateIsConfigured(campaign: Pick<Campaign, "bioKeywords">): boolean {
  return normalizeBioKeywords(campaign.bioKeywords).length > 0;
}

export function checkBioKeywords(
  bioText: string,
  keywords: readonly string[],
): { passed: boolean; missingKeywords: string[] } {
  const normalizedBio = normalizeBioText(bioText);
  const missingKeywords = normalizeBioKeywords(keywords).filter(
    (keyword) => !normalizedBio.includes(normalizeBioText(keyword)),
  );
  return { passed: missingKeywords.length === 0, missingKeywords };
}

export async function getCreatorCampaignAccountOptions(
  creatorProfileId: string,
  campaignPlatforms: readonly Platform[],
): Promise<CampaignBioAccountOption[]> {
  const allowedTypes = campaignAllowedConnectionTypes(campaignPlatforms);
  const accounts = await getSocialAccountSummariesForProfile(creatorProfileId);
  return Object.values(accounts)
    .flat()
    .filter((account) => allowedTypes.has(account.connectionType) && account.isVerified)
    .map(toAccountOption);
}

export async function verifySelectedCampaignAccounts({
  creatorProfileId,
  campaign,
  selectedAccounts,
}: {
  creatorProfileId: string;
  campaign: CampaignBioConfig;
  selectedAccounts: SelectedCampaignAccount[];
}): Promise<CampaignBioVerificationResult[]> {
  const keywords = normalizeBioKeywords(campaign.bioKeywords);
  const allowedTypes = campaignAllowedConnectionTypes(campaign.platforms);
  const options = await getCreatorCampaignAccountOptions(creatorProfileId, campaign.platforms);
  const optionsByKey = new Map(options.map((option) => [accountKey(option), option]));
  const seen = new Set<string>();
  const results: CampaignBioVerificationResult[] = [];

  for (const selected of selectedAccounts) {
    const key = accountKey(selected);
    if (seen.has(key)) continue;
    seen.add(key);

    const option = optionsByKey.get(key) ?? fallbackAccountOption(selected);
    if (!allowedTypes.has(selected.connectionType)) {
      results.push({
        ...option,
        status: "FAILED",
        missingKeywords: keywords,
        failureReason: "This account is not allowed for this campaign.",
      });
      continue;
    }

    if (!optionsByKey.has(key)) {
      results.push({
        ...option,
        status: "FAILED",
        missingKeywords: keywords,
        failureReason: "This account is not connected or verified.",
      });
      continue;
    }

    const bio = await fetchConnectionBioText(selected, creatorProfileId);
    if (!bio.ok) {
      results.push({
        ...option,
        status: "FAILED",
        missingKeywords: keywords,
        failureReason: bio.error,
      });
      continue;
    }

    const check = checkBioKeywords(bio.bioText, keywords);
    results.push({
      ...option,
      status: check.passed ? "VERIFIED" : "FAILED",
      missingKeywords: check.missingKeywords,
      failureReason: check.passed ? null : "Selected page does not meet the bio requirements.",
    });
  }

  return results;
}

export async function runSubmissionBioCheck(submissionId: string): Promise<void> {
  const submission = await prisma.campaignSubmission.findUnique({
    where: { id: submissionId },
    include: {
      application: {
        select: {
          id: true,
          creatorProfileId: true,
          campaign: {
            select: {
              requiresApproval: true,
              bioKeywords: true,
              platforms: true,
            },
          },
        },
      },
    },
  });

  if (!submission) return;
  const campaign = submission.application.campaign;
  if (!campaignRequiresBioGate(campaign)) {
    await prisma.campaignSubmission.update({
      where: { id: submission.id },
      data: { bioCheckStatus: "NOT_REQUIRED", bioCheckedAt: new Date() },
    });
    return;
  }

  const keywords = normalizeBioKeywords(campaign.bioKeywords);
  if (keywords.length === 0) {
    await failSubmissionBioCheck(submission.id, "Campaign bio gate is not configured.");
    return;
  }

  if (
    !submission.sourceConnectionType ||
    !submission.sourceConnectionId ||
    !submission.application.creatorProfileId
  ) {
    await failSubmissionBioCheck(submission.id, "Submission source account is missing.");
    return;
  }

  const verifiedConnection = await prisma.campaignApplicationConnection.findFirst({
    where: {
      applicationId: submission.applicationId,
      connectionType: submission.sourceConnectionType,
      connectionId: submission.sourceConnectionId,
      status: "VERIFIED",
    },
    select: { id: true },
  });
  if (!verifiedConnection) {
    await failSubmissionBioCheck(submission.id, "This account is not approved for this campaign.");
    return;
  }

  const bio = await fetchConnectionBioText(
    {
      connectionType: submission.sourceConnectionType,
      connectionId: submission.sourceConnectionId,
    },
    submission.application.creatorProfileId,
  );
  if (!bio.ok) {
    await failSubmissionBioCheck(submission.id, bio.error);
    return;
  }

  const check = checkBioKeywords(bio.bioText, keywords);
  if (!check.passed) {
    await failSubmissionBioCheck(
      submission.id,
      `Bio requirement missing: ${check.missingKeywords.join(", ")}`,
    );
    return;
  }

  await prisma.campaignSubmission.update({
    where: { id: submission.id },
    data: {
      bioCheckStatus: "PASSED",
      bioCheckFailureReason: null,
      bioCheckedAt: new Date(),
    },
  });
}

export function campaignAllowedConnectionTypes(platforms: readonly Platform[]): Set<ConnectionType> {
  const selected = platforms
    .map((platform) => PLATFORM_TO_CONNECTION_TYPE[platform])
    .filter((type): type is ConnectionType => Boolean(type));
  return new Set(platforms.length === 0 ? ["IG", "TT", "YT", "FB"] : selected);
}

function normalizeBioText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/\bwww\./g, "")
    .replace(/[/?#]+$/g, "")
    .replace(/[^a-z0-9._/@-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toAccountOption(account: SocialAccountSummary): CampaignBioAccountOption {
  return {
    connectionType: account.connectionType,
    connectionId: account.id,
    platform: account.platform,
    label: account.label,
    handle: account.handle,
    audienceCount: account.audienceCount,
    isVerified: account.isVerified,
  };
}

function fallbackAccountOption(selected: SelectedCampaignAccount): CampaignBioAccountOption {
  return {
    connectionType: selected.connectionType,
    connectionId: selected.connectionId,
    platform: connectionTypeToSlug(selected.connectionType),
    label: `${selected.connectionType} account`,
    handle: null,
    audienceCount: null,
    isVerified: false,
  };
}

async function fetchConnectionBioText(
  selected: SelectedCampaignAccount,
  creatorProfileId: string,
): Promise<{ ok: true; bioText: string } | { ok: false; error: string }> {
  try {
    if (selected.connectionType === "IG") {
      const conn = await prisma.creatorIgConnection.findFirst({
        where: { id: selected.connectionId, creatorProfileId, isVerified: true },
      });
      if (!conn?.accessToken || !conn.accessTokenIv || !conn.igUserId) {
        return { ok: false, error: "Instagram account token is missing. Reconnect the account." };
      }
      const token = decrypt(conn.accessToken, conn.accessTokenIv);
      const profile = await fetchInstagramProfile(token, conn.igUserId);
      return { ok: true, bioText: [profile.biography, profile.website].filter(Boolean).join(" ") };
    }

    if (selected.connectionType === "TT") {
      const conn = await prisma.creatorTikTokConnection.findFirst({
        where: { id: selected.connectionId, creatorProfileId, isVerified: true },
      });
      if (!conn) return { ok: false, error: "TikTok account is not connected." };
      const token = await getFreshTikTokAccessToken(conn);
      if (!token) return { ok: false, error: "TikTok account token is missing. Reconnect the account." };
      const profile = await fetchTikTokProfile(token);
      return { ok: true, bioText: profile.bioDescription ?? "" };
    }

    if (selected.connectionType === "YT") {
      const conn = await prisma.creatorYtConnection.findFirst({
        where: { id: selected.connectionId, creatorProfileId, isVerified: true },
      });
      if (!conn) return { ok: false, error: "YouTube account is not connected." };
      const token = await getFreshYoutubeAccessToken(conn);
      if (!token) return { ok: false, error: "YouTube account token is missing. Reconnect the account." };
      const profile = await fetchChannelProfile(token);
      return { ok: true, bioText: profile.description ?? "" };
    }

    const conn = await prisma.creatorFbConnection.findFirst({
      where: { id: selected.connectionId, creatorProfileId, isVerified: true },
    });
    if (!conn?.accessToken || !conn.accessTokenIv || !conn.fbPageId) {
      return { ok: false, error: "Facebook page token is missing. Reconnect the page." };
    }
    const token = decrypt(conn.accessToken, conn.accessTokenIv);
    const profile = await fetchFacebookPageProfile(conn.fbPageId, token);
    return { ok: true, bioText: [profile.about, profile.username].filter(Boolean).join(" ") };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not verify this account bio.",
    };
  }
}

async function failSubmissionBioCheck(submissionId: string, reason: string): Promise<void> {
  await prisma.campaignSubmission.update({
    where: { id: submissionId },
    data: {
      status: "BIO_FAILED",
      bioCheckStatus: "FAILED",
      bioCheckFailureReason: reason,
      bioCheckedAt: new Date(),
      rejectionNote: reason,
      earnedAmount: 0,
    },
  });
}

function accountKey(account: SelectedCampaignAccount | CampaignBioAccountOption): string {
  return `${account.connectionType}:${account.connectionId}`;
}

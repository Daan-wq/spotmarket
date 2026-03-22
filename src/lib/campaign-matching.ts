import { computeDemographicStats } from "@/lib/instagram";
import type { SocialAccount, Campaign } from "@prisma/client";
import type { IgDemographics } from "@/types/instagram";

export interface MatchCheck {
  label: string;
  required: number | null;
  actual: number | null;
  pass: boolean;
}

export interface PageMatchResult {
  page: SocialAccount;
  allPassed: boolean;
  checks: MatchCheck[];
}

export function getPageMatchResult(page: SocialAccount, campaign: Campaign): PageMatchResult {
  const checks: MatchCheck[] = [];
  const stats = computeDemographicStats(page.igDemographics as IgDemographics | null);

  if (campaign.minFollowers > 0) {
    checks.push({
      label: "Followers",
      required: campaign.minFollowers,
      actual: page.followerCount,
      pass: page.followerCount >= campaign.minFollowers,
    });
  }

  if (Number(campaign.minEngagementRate) > 0) {
    checks.push({
      label: "Engagement rate",
      required: Number(campaign.minEngagementRate),
      actual: Number(page.engagementRate),
      pass: Number(page.engagementRate) >= Number(campaign.minEngagementRate),
    });
  }

  if (campaign.targetCountry) {
    const required = campaign.targetCountryPercent ?? 20;
    const actual = stats.topCountry === campaign.targetCountry ? (stats.topCountryPercent ?? 0) : 0;
    checks.push({
      label: `${campaign.targetCountry} audience`,
      required,
      actual,
      pass: stats.topCountry === campaign.targetCountry && actual >= required,
    });
  }

  if (campaign.targetMinAge18Percent) {
    checks.push({
      label: "18+ audience",
      required: campaign.targetMinAge18Percent,
      actual: stats.age18PlusPercent ?? null,
      pass: (stats.age18PlusPercent ?? 0) >= campaign.targetMinAge18Percent,
    });
  }

  if (campaign.targetMalePercent) {
    checks.push({
      label: "Male audience",
      required: campaign.targetMalePercent,
      actual: stats.malePercent ?? null,
      pass: (stats.malePercent ?? 0) >= campaign.targetMalePercent,
    });
  }

  return { page, checks, allPassed: checks.length === 0 || checks.every(c => c.pass) };
}

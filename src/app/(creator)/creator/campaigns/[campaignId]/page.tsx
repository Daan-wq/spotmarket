import Link from "next/link";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import type { Locale } from "@/i18n/routing";
import { getAppUrlFromHeaders } from "@/lib/app-url";
import { buildCampaignReferralUrl } from "@/lib/campaign-referrals";
import {
  formatCurrency,
  formatNumber,
  formatShortDate,
} from "@/lib/i18n-format";
import { prisma } from "@/lib/prisma";
import { resolveThumbnail } from "@/lib/clip-thumbnail";
import { parseClipUrl, type ClipPlatform } from "@/lib/parse-clip-url";
import {
  submissionMinimumPaidViews,
  submissionNeedsPaidViewThreshold,
  submissionViews,
} from "@/lib/earnings";
import {
  CampaignAvatar,
  CampaignBudgetProgress,
  CampaignDeadlineBadge,
  CampaignPlatformRow,
  CampaignStatusBadge,
} from "@/components/campaigns/campaign-display";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { ChevronLeft } from "@/components/animate-ui/icons/chevron-left";
import { evaluateCampaignJoinEligibility } from "@/lib/campaign-eligibility";
import {
  campaignClosedForSubmissionsReason,
  isCampaignClosedForSubmissions,
  isCampaignPubliclyVisible,
} from "@/lib/campaign-submission-state";
import { buildCreatorCampaignConfigSections } from "@/lib/creator-campaign-display";
import { buildCampaignLeaderboardRows } from "@/lib/campaign-leaderboard";
import {
  SubmittedClipsList,
  type SubmittedClipData,
} from "@/components/submissions/submitted-clips-list";
import { CampaignDetailClient } from "./_components/campaign-detail-client";
import { ContactSupportButton } from "./_components/contact-support-button";
import { CampaignReferralLinkCard } from "./_components/campaign-referral-link-card";

const CLIP_TO_PLATFORM_ICON: Record<ClipPlatform, string | null> = {
  INSTAGRAM: "INSTAGRAM",
  TIKTOK: "TIKTOK",
  FACEBOOK: "FACEBOOK",
  YOUTUBE: "YOUTUBE_SHORTS",
  UNKNOWN: null,
};

type ClipMediaType = "video" | "image" | "carousel";

const asClipMediaType = (v: string | null | undefined): ClipMediaType | null =>
  v === "video" || v === "image" || v === "carousel" ? v : null;

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const { userId } = await requireAuth("creator");
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("creator.campaigns.detail");
  const sharedT = await getTranslations("creator.shared");

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      campaignSubmissions: {
        select: { earnedAmount: true, status: true },
      },
    },
  });
  if (!campaign || !isCampaignPubliclyVisible(campaign.status)) notFound();

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true, discordId: true, referralCode: true },
  });
  if (!user) throw new Error("User not found");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) throw new Error("Creator profile not found");

  const [igConnections, ytConnections, ttConnections, fbConnections] =
    await Promise.all([
      prisma.creatorIgConnection.findMany({
        where: { creatorProfileId: profile.id },
      }),
      prisma.creatorYtConnection.findMany({
        where: { creatorProfileId: profile.id },
      }),
      prisma.creatorTikTokConnection.findMany({
        where: { creatorProfileId: profile.id },
      }),
      prisma.creatorFbConnection.findMany({
        where: { creatorProfileId: profile.id },
      }),
    ]);
  const eligibility = evaluateCampaignJoinEligibility(campaign.platforms, {
    instagram: igConnections.some((c) => c.isVerified),
    youtube: ytConnections.some((c) => c.isVerified),
    tiktok: ttConnections.some((c) => c.isVerified),
    facebook: fbConnections.some((c) => c.isVerified),
  });

  const existingApplication = await prisma.campaignApplication.findFirst({
    where: { campaignId, creatorProfileId: profile.id },
  });

  const mySubmissions = await prisma.campaignSubmission.findMany({
    where: { campaignId, creatorId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      postUrl: true,
      thumbnailUrl: true,
      mediaType: true,
      status: true,
      earnedAmount: true,
      claimedViews: true,
      viewCount: true,
      baselineViews: true,
      createdAt: true,
      campaign: {
        select: {
          name: true,
          creatorCpv: true,
          minimumPaidViews: true,
          maximumPaidViews: true,
        },
      },
    },
  });

  const topEarnerSubmissions = await prisma.campaignSubmission.findMany({
    where: { campaignId, status: "APPROVED" },
    select: {
      postUrl: true,
      creatorId: true,
      viewCount: true,
      claimedViews: true,
      eligibleViews: true,
      baselineViews: true,
      earnedAmount: true,
      metricSnapshots: {
        orderBy: { capturedAt: "desc" },
        take: 1,
        select: { viewCount: true, capturedAt: true },
      },
      campaign: {
        select: {
          creatorCpv: true,
          minimumPaidViews: true,
          maximumPaidViews: true,
        },
      },
      creator: {
        select: {
          email: true,
          discordUsername: true,
          creatorProfile: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });
  const topEarners = buildCampaignLeaderboardRows(topEarnerSubmissions)
    .sort((a, b) => b.totalEarned - a.totalEarned || b.totalViews - a.totalViews)
    .slice(0, 5);

  const totalPaid = campaign.campaignSubmissions.reduce(
    (sum, s) => sum + Number(s.earnedAmount),
    0,
  );
  const totalBudget = Number(campaign.totalBudget);
  const rewardRate = Number(campaign.creatorCpv) * 1000;
  const hasDiscord = !!user.discordId;
  const isClosedForSubmissions = isCampaignClosedForSubmissions({
    status: campaign.status,
    deadline: campaign.deadline,
  });
  const closedForSubmissionsReason = campaignClosedForSubmissionsReason({
    status: campaign.status,
  });
  const canApply =
    eligibility.eligible &&
    !existingApplication &&
    hasDiscord &&
    !isClosedForSubmissions;
  const configSections = buildCreatorCampaignConfigSections(
    campaign,
    {
      briefTitle: t("briefAndRequirements"),
      resourcesTitle: t("resources"),
      targetingTitle: t("targeting"),
      timelineTitle: t("timelineAndLimits"),
      description: t("description"),
      contentType: t("contentType"),
      requirements: t("requirements"),
      contentGuidelines: t("contentNotes"),
      otherNotes: t("otherNotes"),
      pageStats: t("pageStats"),
      minimumAge: t("minimumAge"),
      requiredHashtags: t("requiredHashtags"),
      trackingLink: t("trackingLink"),
      bannerVideo: t("bannerVideo"),
      briefAsset: t("briefAsset"),
      guidelines: t("guidelines"),
      contentAsset: (index) => t("contentAsset", { index }),
      targetCountry: t("targetCountry"),
      targetCountryAudience: t("targetCountryAudience"),
      target18Audience: t("target18Audience"),
      targetMaleAudience: t("targetMaleAudience"),
      minimumFollowers: t("minimumFollowers"),
      minimumEngagementRate: t("minimumEngagementRate"),
      bioRequirement: t("bioRequirement"),
      linkInBioRequirement: t("linkInBioRequirement"),
      goalViews: t("goalViews"),
      minimumPaidViews: t("minimumPaidViews"),
      maximumPaidViews: t("maximumPaidViews"),
      startDate: t("startDate"),
      deadline: t("deadline"),
      accountLimit: t("accountLimit"),
      approvalRequired: t("approvalRequired"),
      yes: t("yes"),
      unlimited: t("unlimited"),
      pageStatsLabels: {
        minAge: t("minimumAge"),
        minEngagement: t("minimumEngagementRate"),
        minFollowers: t("minimumFollowers"),
        malePercent: t("targetMaleAudience"),
        countryPercent: t("targetCountryAudience"),
      },
    },
    {
      number: (value) => formatNumber(value, locale),
      percent: (value) => `${formatNumber(value, locale)}%`,
      date: (value) => formatShortDate(value, locale),
    },
  );

  const videos: SubmittedClipData[] = await Promise.all(
    mySubmissions.map(async (submission) => {
      const parsed = submission.postUrl
        ? parseClipUrl(submission.postUrl)
        : null;
      const derivedPlatform = parsed
        ? CLIP_TO_PLATFORM_ICON[parsed.platform]
        : null;
      const { thumbnailUrl, mediaType } = await resolveThumbnail(
        submission.postUrl,
        submission.thumbnailUrl,
        {
          creatorId: user.id,
          submissionId: submission.id,
          storedMediaType: asClipMediaType(submission.mediaType),
        },
      );
      const needsThreshold = submissionNeedsPaidViewThreshold(submission);
      const earned = Number(submission.earnedAmount ?? 0);

      return {
        id: submission.id,
        postUrl: submission.postUrl,
        thumbnailUrl,
        mediaType,
        status: submission.status,
        earned,
        earningDisplay: needsThreshold
          ? {
              state: "threshold" as const,
              minimumPaidViews: submissionMinimumPaidViews(submission),
            }
          : {
              state: "amount" as const,
              amount: earned,
            },
        views: submissionViews(submission),
        createdAt: submission.createdAt.toISOString(),
        campaignName: submission.campaign.name,
        platform: derivedPlatform,
      };
    }),
  );

  const statusCounts = {
    PENDING: videos.filter((v) => v.status === "PENDING").length,
    FLAGGED: videos.filter((v) => v.status === "FLAGGED").length,
    REJECTED: videos.filter((v) => v.status === "REJECTED").length,
    APPROVED: videos.filter((v) => v.status === "APPROVED").length,
    ALL: videos.length,
  };
  const myViews = videos.reduce((sum, video) => sum + video.views, 0);
  const recordedEarned = videos.reduce((sum, video) => sum + video.earned, 0);
  const headerStore = await headers();
  const campaignReferralUrl =
    campaign.slug && user.referralCode
      ? buildCampaignReferralUrl(
          campaign.slug,
          user.referralCode,
          getAppUrlFromHeaders(headerStore),
        )
      : null;

  return (
    <div className="w-full space-y-6 md:space-y-8 md:px-6 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <AnimateIcon animateOnHover asChild>
          <Link
            href="/creator/campaigns"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50"
          >
            <ChevronLeft className="-ml-1 h-4 w-4" />
            {t("back")}
          </Link>
        </AnimateIcon>
        <ContactSupportButton />
      </div>

      <header className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <CampaignAvatar
              name={campaign.name}
              imageUrl={campaign.bannerUrl}
              size="lg"
            />
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold tracking-normal text-neutral-950 md:text-3xl">
                {campaign.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <CampaignStatusBadge
                  status={campaign.status}
                  deadline={campaign.deadline}
                />
                {!isClosedForSubmissions ? (
                  <CampaignDeadlineBadge deadline={campaign.deadline} />
                ) : null}
                <CampaignPlatformRow platforms={campaign.platforms} />
              </div>
            </div>
          </div>
          <div className="w-full md:max-w-xs">
            <CampaignBudgetProgress
              totalPaid={totalPaid}
              totalBudget={totalBudget}
            />
          </div>
        </div>
      </header>

      <CampaignDetailClient
        campaignId={campaignId}
        campaignName={campaign.name}
        canApply={canApply}
        hasApplication={!!existingApplication}
        applicationId={existingApplication?.id}
        hasRequiredPlatform={eligibility.eligible}
        missingPlatformLabels={eligibility.missingPlatformLabels}
        hasDiscord={hasDiscord}
        isClosedForSubmissions={isClosedForSubmissions}
        closedForSubmissionsReason={closedForSubmissionsReason}
      />

      {campaignReferralUrl ? (
        <CampaignReferralLinkCard referralUrl={campaignReferralUrl} />
      ) : null}

      <section>
        <SectionTitle title={t("info")} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <InfoCard
            label={t("payoutPer1K")}
            value={formatCurrency(rewardRate, locale)}
            detail={t("baseRate")}
          />
          <InfoCard
            label={t("startDate")}
            value={formatShortDate(
              campaign.startsAt ?? campaign.createdAt,
              locale,
            )}
            detail={
              campaign.startsAt ? t("campaignStart") : t("campaignCreated")
            }
          />
          <InfoCard
            label={t("yourClips")}
            value={formatNumber(videos.length, locale)}
            detail={t("yourSubmissions")}
          />
          <InfoCard
            label={t("yourViews")}
            value={formatNumber(myViews, locale)}
            detail={t("trackedCampaign")}
          />
        </div>
      </section>

      <section>
        <SectionTitle title={t("details")} />
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
          <div className="border-b border-neutral-200 bg-white px-5 py-4">
            <h2 className="text-base font-semibold text-neutral-950">
              {t("programRules")}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {t("programRulesDescription")}
            </p>
          </div>
          <div className="divide-y divide-neutral-200">
            {configSections.map((section) => (
              <CampaignConfigSection key={section.id} section={section} />
            ))}
          </div>
        </div>
      </section>

      <section>
        <SectionTitle title={t("payouts")} />
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
          <div className="grid grid-cols-1 gap-4">
            <InfoCard
              label={t("recorded")}
              value={formatCurrency(recordedEarned, locale)}
              detail={t("currentEarnings")}
            />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle title={t("yourClipsSection")} />
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
          <SubmittedClipsList
            videos={videos}
            statusCounts={statusCounts}
            mode="campaign"
            detailBasePath="/creator/videos"
            showCampaignColumn={false}
            campaignFilterLabel={campaign.name}
            emptyState={{
              title: t("noClipsTitle"),
              description: t("noClipsDescription"),
              primaryCta:
                existingApplication?.id && !isClosedForSubmissions
                  ? {
                      label: sharedT("actions.submitClip"),
                      href: `/creator/applications/${existingApplication.id}/submit`,
                    }
                  : undefined,
            }}
          />
        </div>
      </section>

      <section>
        <SectionTitle title={t("biggestEarners")} />
        {topEarners.length === 0 ? (
          <p className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-500">
            {t("noEarners")}
          </p>
        ) : (
          <div className="space-y-2">
            {topEarners.map((earner, index) => (
              <div
                key={earner.creatorId}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3"
              >
                <span className="w-8 text-center text-sm font-bold text-neutral-400">
                  #{index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-neutral-950">
                    {earner.displayName}
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {formatNumber(earner.totalViews, locale)}{" "}
                    {sharedT("units.views")}
                  </span>
                </div>
                <span className="text-sm font-semibold text-emerald-600">
                  +{formatCurrency(earner.totalEarned, locale)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2 className="text-sm font-semibold text-neutral-950">{title}</h2>
      <div className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}

function InfoCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 md:p-4">
      <p className="text-xs font-medium text-neutral-700 md:text-sm">{label}</p>
      <p className="mt-1.5 break-words text-xl font-semibold tracking-normal text-neutral-950 md:mt-2 md:text-2xl">
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-neutral-500 md:text-xs">
        {detail}
      </p>
    </div>
  );
}

function CampaignConfigSection({
  section,
}: {
  section: ReturnType<typeof buildCreatorCampaignConfigSections>[number];
}) {
  return (
    <div className="px-5 py-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
        {section.title}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {section.items.map((item) => (
          <CampaignConfigItem key={`${item.label}-${item.kind}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function CampaignConfigItem({
  item,
}: {
  item: ReturnType<typeof buildCreatorCampaignConfigSections>[number]["items"][number];
}) {
  const value =
    item.kind === "link" ? (
      <a
        className="break-all font-medium text-neutral-950 underline underline-offset-2 transition hover:text-neutral-600"
        href={item.href}
        target="_blank"
        rel="noreferrer"
      >
        {item.href}
      </a>
    ) : (
      <span
        className={
          item.kind === "multiline"
            ? "whitespace-pre-wrap break-words font-medium text-neutral-950"
            : "break-words font-medium text-neutral-950"
        }
      >
        {item.value}
      </span>
    );

  return (
    <div className={item.kind === "multiline" ? "text-sm md:col-span-2" : "text-sm"}>
      <p className="mb-1 text-neutral-500">{item.label}</p>
      {value}
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import type { Locale } from "@/i18n/routing";
import {
  formatCurrency,
  formatNumber,
  formatShortDate,
} from "@/lib/i18n-format";
import { prisma } from "@/lib/prisma";
import { resolveThumbnail } from "@/lib/clip-thumbnail";
import { parseClipUrl, type ClipPlatform } from "@/lib/parse-clip-url";
import {
  submissionProjectedEarnings,
  submissionViews,
  totalProjectedEarnings,
} from "@/lib/earnings";
import {
  CampaignAvatar,
  CampaignBudgetProgress,
  CampaignDeadlineBadge,
  CampaignPlatformRow,
  CampaignStatusBadge,
} from "@/components/campaigns/campaign-display";
import { evaluateCampaignJoinEligibility } from "@/lib/campaign-eligibility";
import { isCampaignClosedForSubmissions } from "@/lib/campaign-submission-state";
import {
  SubmittedClipsList,
  type SubmittedClipData,
} from "@/components/submissions/submitted-clips-list";
import { CampaignDetailClient } from "./_components/campaign-detail-client";

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
  if (!campaign || campaign.status !== "active") notFound();

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true, discordId: true },
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
      createdAt: true,
      campaign: {
        select: {
          name: true,
          creatorCpv: true,
        },
      },
    },
  });

  const topEarners = await prisma.campaignSubmission.groupBy({
    by: ["creatorId"],
    where: { campaignId, status: "APPROVED" },
    _sum: { earnedAmount: true },
    orderBy: { _sum: { earnedAmount: "desc" } },
    take: 5,
  });

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
  const canApply =
    eligibility.eligible &&
    !existingApplication &&
    hasDiscord &&
    !isClosedForSubmissions;
  const requirementSteps = campaign.requirements
    ? campaign.requirements.split("\n").filter((r) => r.trim())
    : [];

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

      return {
        id: submission.id,
        postUrl: submission.postUrl,
        thumbnailUrl,
        mediaType,
        status: submission.status,
        earned: submissionProjectedEarnings(submission),
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
  const projectedEarned = totalProjectedEarnings(mySubmissions);

  return (
    <div className="w-full space-y-6 md:space-y-8 md:px-6 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/creator/campaigns"
          className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          {t("back")}
        </Link>
        <Link
          href={`/creator/campaigns/${campaignId}/contact`}
          className="inline-flex h-10 items-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50"
        >
          {t("contact")}
        </Link>
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
                <CampaignDeadlineBadge deadline={campaign.deadline} />
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
      />

      <section>
        <SectionTitle title={t("info")} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <InfoCard
            label={t("payoutPer1K")}
            value={formatCurrency(rewardRate, locale, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
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
          <div className="grid gap-4 px-5 py-4 md:grid-cols-2">
            <DetailRow
              label={t("accountLimit")}
              value={
                campaign.maxSlots
                  ? `${formatNumber(campaign.maxSlots, locale)} ${sharedT("units.creators")}`
                  : t("unlimited")
              }
            />
            <DetailRow
              label={t("category")}
              value={campaign.contentType ?? campaign.niche ?? t("general")}
            />
            {campaign.referralLink ? (
              <DetailRow
                label={t("trackingLink")}
                value={
                  <a
                    className="underline"
                    href={campaign.referralLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("openLink")}
                  </a>
                }
              />
            ) : null}
            {campaign.guidelinesUrl ? (
              <DetailRow
                label={t("guidelines")}
                value={
                  <a
                    className="underline"
                    href={campaign.guidelinesUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("openGuidelines")}
                  </a>
                }
              />
            ) : null}
          </div>
          {requirementSteps.length > 0 ? (
            <div className="border-t border-neutral-200 px-5 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                {t("requirements")}
              </p>
              <div className="flex flex-wrap gap-2">
                {requirementSteps.map((step, index) => (
                  <span
                    key={`${step}-${index}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950"
                  >
                    <span className="font-semibold text-neutral-400">
                      {index + 1}/
                    </span>
                    {step.trim()}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {campaign.contentGuidelines ? (
            <div className="border-t border-neutral-200 px-5 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                {t("contentNotes")}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                {campaign.contentGuidelines}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <SectionTitle title={t("payouts")} />
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoCard
              label={t("estimate")}
              value={formatCurrency(projectedEarned, locale)}
              detail={t("trackedOrClaimed")}
            />
            <InfoCard
              label={t("recorded")}
              value={formatCurrency(
                mySubmissions.reduce(
                  (sum, s) => sum + Number(s.earnedAmount ?? 0),
                  0,
                ),
                locale,
              )}
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
                <span className="flex-1 text-sm font-medium text-neutral-950">
                  {sharedT("fallbackCreator")}
                </span>
                <span className="text-sm font-semibold text-emerald-600">
                  +
                  {formatCurrency(
                    Number(earner._sum.earnedAmount ?? 0),
                    locale,
                  )}
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
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-sm font-medium text-neutral-700">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-normal text-neutral-950">
        {value}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-medium text-neutral-950">{value}</span>
    </div>
  );
}

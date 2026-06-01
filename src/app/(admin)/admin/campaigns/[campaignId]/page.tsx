import Link from "next/link";
import { notFound } from "next/navigation";
import { KpiCard } from "@/components/admin/kpi-card";
import {
  CampaignAvatar,
  CampaignBudgetProgress,
  CampaignDeadlineBadge,
  CampaignPlatformRow,
  CampaignStatusBadge,
} from "@/components/campaigns/campaign-display";
import { prisma } from "@/lib/prisma";
import { isExcludedFromLeaderboards } from "@/lib/leaderboard-exclusions";
import { calculateCampaignReferralReport } from "@/lib/campaign-referrals";
import { calculateCampaignDelivery, submissionLiveViews } from "@/lib/campaign-delivery";
import { CampaignSubmissionsOverview } from "./campaign-submissions-overview";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ campaignId: string }>;
}

export default async function CampaignHealthPage({ params }: PageProps) {
  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      campaignSubmissions: {
        select: {
          id: true,
          creatorId: true,
          status: true,
          postUrl: true,
          sourcePlatform: true,
          claimedViews: true,
          viewCount: true,
          eligibleViews: true,
          earnedAmount: true,
          rejectionNote: true,
          reviewedAt: true,
          settledAt: true,
          createdAt: true,
          creator: {
            select: {
              id: true,
              email: true,
              discordUsername: true,
              creatorProfile: { select: { id: true, displayName: true, username: true } },
            },
          },
          payoutRunItems: { select: { id: true } },
          submissionSignals: {
            where: {
              resolvedAt: null,
              severity: { in: ["WARN", "CRITICAL"] },
              type: { not: "VELOCITY_DROP" },
            },
            select: { id: true, type: true, severity: true },
          },
          metricSnapshots: {
            orderBy: { capturedAt: "desc" },
            take: 1,
            select: { capturedAt: true, viewCount: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      referralAttributions: {
        select: {
          id: true,
          referrerId: true,
          referredUserId: true,
          clickedAt: true,
          signedUpAt: true,
          onboardedAt: true,
          discordLinkedAt: true,
          socialConnectedAt: true,
          firstSubmissionAt: true,
          activeAt: true,
          firstEarnedAmount: true,
          referrer: {
            select: {
              email: true,
              discordUsername: true,
              creatorProfile: {
                select: { displayName: true, username: true },
              },
            },
          },
        },
        orderBy: { clickedAt: "desc" },
      },
    },
  });
  if (!campaign) return notFound();

  const totalEarned = campaign.campaignSubmissions.reduce(
    (sum, submission) => sum + Number(submission.earnedAmount ?? 0),
    0,
  );
  const totalBudget = Number(campaign.totalBudget);
  const delivery = calculateCampaignDelivery({
    campaign: {
      totalBudget,
      creatorCpv: campaign.creatorCpv,
      goalViews: campaign.goalViews ? Number(campaign.goalViews) : null,
    },
    submissions: campaign.campaignSubmissions,
  });
  const targetViews = delivery.targetViews;
  const currentViews = delivery.currentViews;
  const overdeliveryViews = delivery.overdeliveryViews;
  const minimumPaidViews = campaign.minimumPaidViews ?? 0;
  const maximumPaidViews = campaign.maximumPaidViews;
  const burnPct = totalBudget > 0 ? totalEarned / totalBudget : 0;
  const goalPct = delivery.deliveryProgress ?? 0;
  const earnedByInvitedCreator = new Map<string, number>();

  for (const submission of campaign.campaignSubmissions) {
    if (submission.status !== "APPROVED") continue;
    earnedByInvitedCreator.set(
      submission.creatorId,
      (earnedByInvitedCreator.get(submission.creatorId) ?? 0) +
        Number(submission.earnedAmount ?? 0),
    );
  }

  const referralReport = calculateCampaignReferralReport({
    totalBudget,
    attributions: campaign.referralAttributions.map((attribution) => ({
      referrerId: attribution.referrerId,
      referrerLabel:
        attribution.referrer.creatorProfile?.displayName ??
        attribution.referrer.discordUsername ??
        attribution.referrer.email,
      referredUserId: attribution.referredUserId,
      clickedAt: attribution.clickedAt,
      signedUpAt: attribution.signedUpAt,
      onboardedAt: attribution.onboardedAt,
      discordLinkedAt: attribution.discordLinkedAt,
      socialConnectedAt: attribution.socialConnectedAt,
      firstSubmissionAt: attribution.firstSubmissionAt,
      activeAt: attribution.activeAt,
      earnedAmount: attribution.referredUserId
        ? earnedByInvitedCreator.get(attribution.referredUserId) ?? 0
        : Number(attribution.firstEarnedAmount ?? 0),
    })),
  });

  const byCreator = new Map<
    string,
    {
      creatorId: string;
      email: string;
      displayName: string | null;
      profileId: string | null;
      submissions: number;
      views: number;
      earned: number;
      flagged: number;
    }
  >();

  for (const submission of campaign.campaignSubmissions) {
    if (isExcludedFromLeaderboards(submission.creator)) continue;

    const current =
      byCreator.get(submission.creatorId) ??
      {
        creatorId: submission.creatorId,
        email: submission.creator.email,
        displayName: submission.creator.creatorProfile?.displayName ?? null,
        profileId: submission.creator.creatorProfile?.id ?? null,
        submissions: 0,
        views: 0,
        earned: 0,
        flagged: 0,
      };
    current.submissions += 1;
    if (submission.status === "APPROVED") {
      current.views += submissionLiveViews(submission);
    }
    current.earned += Number(submission.earnedAmount ?? 0);
    current.flagged += submission.submissionSignals.length > 0 ? 1 : 0;
    byCreator.set(submission.creatorId, current);
  }

  const leaderboard = Array.from(byCreator.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  const creatorOptions = Array.from(byCreator.values())
    .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email))
    .map((creator) => ({
      id: creator.creatorId,
      label: creator.displayName || creator.email,
      email: creator.email,
    }));

  const overviewSubmissions = campaign.campaignSubmissions.map((submission) => ({
    id: submission.id,
    creatorId: submission.creatorId,
    creatorEmail: submission.creator.email,
    creatorDisplayName: submission.creator.creatorProfile?.displayName ?? null,
    creatorProfileId: submission.creator.creatorProfile?.id ?? null,
    postUrl: submission.postUrl,
    status: submission.status,
    sourcePlatform: submission.sourcePlatform,
    createdAt: submission.createdAt.toISOString(),
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    eligibleViews: submission.eligibleViews,
    viewCount: submission.viewCount,
    claimedViews: submission.claimedViews,
    earnedAmount: Number(submission.earnedAmount ?? 0),
    rejectionNote: submission.rejectionNote,
    settledAt: submission.settledAt?.toISOString() ?? null,
    payoutRunItemCount: submission.payoutRunItems.length,
    signals: submission.submissionSignals,
  }));

  return (
    <div className="w-full p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link href="/admin/campaigns" className="text-xs underline" style={{ color: "var(--text-secondary)" }}>
            Terug naar alle campagnes
          </Link>
          <div className="mt-3 flex items-start gap-4">
            <CampaignAvatar name={campaign.name} imageUrl={campaign.bannerUrl} size="lg" />
            <div className="min-w-0">
              <h1 className="mb-2 text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                {campaign.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <CampaignStatusBadge status={campaign.status} deadline={campaign.deadline} />
                <CampaignDeadlineBadge deadline={campaign.deadline} />
                <CampaignPlatformRow platforms={campaign.platforms} />
              </div>
            </div>
          </div>
          <p className="hidden" style={{ color: "var(--text-secondary)" }}>
            {campaign.status} deadline {campaign.deadline.toLocaleDateString("nl-NL")}{" "}
            {campaign.platforms.map((p) => p.toLowerCase()).join(" / ")}
          </p>
          <div className="mt-5 max-w-xl">
            <CampaignBudgetProgress
              totalPaid={totalEarned}
              totalBudget={totalBudget}
              status={campaign.status}
              deadline={campaign.deadline}
            />
          </div>
        </div>
        <Link
          href={`/admin/campaigns/${campaign.id}/edit`}
          className="rounded-md px-3 py-1.5 text-xs font-medium"
          style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
        >
          Campagne bewerken
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="w-full sm:w-[220px] xl:w-[240px]">
          <KpiCard
            label="Budgetverbruik"
            value={`EUR ${totalEarned.toFixed(2)}`}
            hint={`van EUR ${totalBudget.toFixed(2)} (${Math.round(burnPct * 100)}%)`}
            tone={burnPct > 0.9 ? "warning" : "default"}
          />
        </div>
        <div className="w-full sm:w-[220px] xl:w-[240px]">
          <KpiCard
            label="Doelviews"
            value={targetViews ? targetViews.toLocaleString("nl-NL") : "-"}
            hint={delivery.targetViewsSource === "budget_cpm" ? "budget / CPM" : "legacy doel"}
          />
        </div>
        <div className="w-full sm:w-[220px] xl:w-[240px]">
          <KpiCard
            label="Huidige views"
            value={currentViews.toLocaleString("nl-NL")}
            hint={targetViews ? `${Math.round(goalPct * 100)}% van doel` : "live approved views"}
            tone={targetViews && goalPct < 0.5 ? "warning" : goalPct >= 1 ? "success" : "default"}
          />
        </div>
        <div className="w-full sm:w-[220px] xl:w-[240px]">
          <KpiCard
            label="Overdelivery"
            value={overdeliveryViews.toLocaleString("nl-NL")}
            hint={overdeliveryViews > 0 ? "gratis extra bereik" : "nog geen bonusviews"}
            tone={overdeliveryViews > 0 ? "success" : "default"}
          />
        </div>
        <div className="w-full sm:w-[190px] xl:w-[210px]">
          <KpiCard label="Inzendingen" value={campaign.campaignSubmissions.length} hint="alle statussen" />
        </div>
        <div className="w-full sm:w-[220px] xl:w-[250px]">
          <KpiCard
            label="Actieve makers"
            value={byCreator.size}
            hint="unieke makers met inzendingen"
          />
        </div>
        <div className="w-full sm:w-[220px] xl:w-[240px]">
          <KpiCard
            label="Minimum betaalde views"
            value={minimumPaidViews.toLocaleString("nl-NL")}
            hint="per ingezonden video"
          />
        </div>
        <div className="w-full sm:w-[220px] xl:w-[240px]">
          <KpiCard
            label="Maximum betaalde views"
            value={maximumPaidViews === null ? "Onbeperkt" : maximumPaidViews.toLocaleString("nl-NL")}
            hint="per ingezonden video"
          />
        </div>
      </div>

      {overdeliveryViews > 0 ? (
        <div
          className="mb-6 rounded-xl px-5 py-4 text-sm"
          style={{ background: "var(--success-bg)", border: "1px solid var(--border)", color: "var(--success-text)" }}
        >
          <strong>Gratis bonus voor de client:</strong> deze campagne levert nog steeds views boven het afgesproken doel.
        </div>
      ) : null}

      <div className="space-y-6">
        <section
          className="overflow-hidden rounded-xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Campagne referral rapportage
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              Invite count telt afgeronde onboarding. Active clipper count telt de eerste ingestuurde submission.
            </p>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-6">
            <KpiCard
              label="Clicks"
              value={referralReport.totalClicks}
              hint="persoonlijke campagne-links"
            />
            <KpiCard
              label="Invite count"
              value={referralReport.inviteCount}
              hint="signup plus onboarding"
            />
            <KpiCard
              label="Actieve clippers"
              value={referralReport.activeClipperCount}
              hint="minimaal 1 submission"
            />
            <KpiCard
              label="Activatie"
              value={`${Math.round(referralReport.activationRate * 100)}%`}
              hint="active / invites"
              tone={referralReport.activationRate > 0.25 ? "success" : "default"}
            />
            <KpiCard
              label="CPA invite"
              value={
                referralReport.cpaPerInvite === null
                  ? "n.v.t."
                  : `EUR ${referralReport.cpaPerInvite.toFixed(2)}`
              }
              hint="budget / invites"
            />
            <KpiCard
              label="CPA active"
              value={
                referralReport.cpaPerActiveClipper === null
                  ? "n.v.t."
                  : `EUR ${referralReport.cpaPerActiveClipper.toFixed(2)}`
              }
              hint="budget / active clippers"
            />
          </div>
          {referralReport.referrers.length === 0 ? (
            <p className="px-5 pb-5 text-sm" style={{ color: "var(--text-secondary)" }}>
              Nog geen campagne-invites gemeten.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                    <th className="px-5 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Referrer
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Clicks
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Invites
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Actief</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Eerste submissions
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Verdiend door invites
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {referralReport.referrers.map((referrer) => (
                    <tr key={referrer.referrerId} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="max-w-[260px] px-5 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                        <span className="block truncate">{referrer.referrerLabel}</span>
                      </td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                        {referrer.clicks}
                      </td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                        {referrer.inviteCount}
                      </td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                        {referrer.activeClipperCount}
                      </td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                        {referrer.firstSubmissions}
                      </td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                        EUR {referrer.totalEarnedByInvitedClippers.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <CampaignSubmissionsOverview
          submissions={overviewSubmissions}
          creators={creatorOptions}
        />

        <section
          className="overflow-hidden rounded-xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Makerklassement
            </h2>
          </div>
          {leaderboard.length === 0 ? (
            <p className="px-5 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
              Nog geen inzendingen.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="px-5 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Maker
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Inzendingen
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Views
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Verdiend
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Gemarkeerd
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((creator) => (
                    <tr key={creator.creatorId} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="max-w-[260px] px-5 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                        {creator.profileId ? (
                          <Link href={`/admin/creators/${creator.profileId}`} className="block truncate underline">
                            {creator.displayName || creator.email}
                          </Link>
                        ) : (
                          <span className="block truncate">{creator.displayName || creator.email}</span>
                        )}
                        <span className="mt-1 block truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                          {creator.email}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                        {creator.submissions}
                      </td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                        {creator.views.toLocaleString("nl-NL")}
                      </td>
                      <td className="px-5 py-3 text-right text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                        EUR {creator.earned.toFixed(2)}
                      </td>
                      <td
                        className="px-5 py-3 text-right text-sm tabular-nums"
                        style={{ color: creator.flagged > 0 ? "var(--warning-text)" : "var(--text-secondary)" }}
                      >
                        {creator.flagged}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

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
              creatorProfile: { select: { id: true, displayName: true } },
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
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!campaign) return notFound();

  const totalEligibleViews = campaign.campaignSubmissions.reduce(
    (sum, submission) => sum + (submission.eligibleViews ?? 0),
    0,
  );
  const totalEarned = campaign.campaignSubmissions.reduce(
    (sum, submission) => sum + Number(submission.earnedAmount ?? 0),
    0,
  );
  const totalBudget = Number(campaign.totalBudget);
  const goalViews = campaign.goalViews ? Number(campaign.goalViews) : 0;
  const minimumPaidViews = campaign.minimumPaidViews ?? 0;
  const maximumPaidViews = campaign.maximumPaidViews;
  const burnPct = totalBudget > 0 ? totalEarned / totalBudget : 0;
  const goalPct = goalViews > 0 ? totalEligibleViews / goalViews : 0;

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
    current.views += submission.eligibleViews ?? 0;
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
            {campaign.status} deadline {campaign.deadline.toLocaleDateString()}{" "}
            {campaign.platforms.map((p) => p.toLowerCase()).join(" / ")}
          </p>
          <div className="mt-5 max-w-xl">
            <CampaignBudgetProgress totalPaid={totalEarned} totalBudget={totalBudget} />
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
            value={totalEligibleViews.toLocaleString()}
            hint={goalViews > 0 ? `van ${goalViews.toLocaleString()} (${Math.round(goalPct * 100)}%)` : "geen doel ingesteld"}
            tone={goalViews > 0 && goalPct < 0.5 ? "warning" : "default"}
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
            value={minimumPaidViews.toLocaleString()}
            hint="per ingezonden video"
          />
        </div>
        <div className="w-full sm:w-[220px] xl:w-[240px]">
          <KpiCard
            label="Maximum betaalde views"
            value={maximumPaidViews === null ? "Onbeperkt" : maximumPaidViews.toLocaleString()}
            hint="per ingezonden video"
          />
        </div>
      </div>

      <div className="space-y-6">
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
                        {creator.views.toLocaleString()}
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

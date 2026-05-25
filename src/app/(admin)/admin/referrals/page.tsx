import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import {
  calculateCampaignReferralReport,
  CLIPPROFIT_CAMPAIGN_SLUG,
  getCampaignReferralBucket,
  type CampaignReferralBucket,
} from "@/lib/campaign-referrals";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatShortDate,
} from "@/lib/admin/agency-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string; referrer?: string }>;
}

type ReferralUser = {
  id: string;
  email: string;
  discordUsername: string | null;
  referralCode?: string | null;
  creatorProfile: {
    displayName: string | null;
    username: string | null;
  } | null;
};

type AttributionRow = {
  id: string;
  clickId: string;
  referralCode: string;
  referrerId: string;
  referredUserId: string | null;
  clickedAt: Date;
  signedUpAt: Date | null;
  onboardedAt: Date | null;
  discordLinkedAt: Date | null;
  socialConnectedAt: Date | null;
  firstSubmissionAt: Date | null;
  activeAt: Date | null;
  firstEarnedAmount: unknown;
  referrer: ReferralUser;
  referredUser: Omit<ReferralUser, "referralCode"> | null;
};

type SubmissionStats = {
  count: number;
  approvedCount: number;
  earnedAmount: number;
  lastSubmissionAt: Date | null;
};

export default async function AdminReferralsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";

  const campaign = await prisma.campaign.findFirst({
    where: { slug: CLIPPROFIT_CAMPAIGN_SLUG },
    select: {
      id: true,
      name: true,
      totalBudget: true,
      referralAttributions: {
        select: {
          id: true,
          clickId: true,
          referralCode: true,
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
              id: true,
              email: true,
              discordUsername: true,
              referralCode: true,
              creatorProfile: {
                select: {
                  displayName: true,
                  username: true,
                },
              },
            },
          },
          referredUser: {
            select: {
              id: true,
              email: true,
              discordUsername: true,
              creatorProfile: {
                select: {
                  displayName: true,
                  username: true,
                },
              },
            },
          },
        },
        orderBy: { clickedAt: "desc" },
      },
    },
  });

  const attributions = (campaign?.referralAttributions ?? []) as AttributionRow[];
  const filteredAttributions = query
    ? attributions.filter((attribution) => matchesReferrerSearch(attribution, query))
    : attributions;

  const referredUserIds = Array.from(
    new Set(
      attributions
        .map((attribution) => attribution.referredUserId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const submissions =
    campaign && referredUserIds.length > 0
      ? await prisma.campaignSubmission.findMany({
          where: {
            campaignId: campaign.id,
            creatorId: { in: referredUserIds },
          },
          select: {
            creatorId: true,
            status: true,
            earnedAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : [];
  const submissionStatsByCreator = buildSubmissionStatsByCreator(submissions);

  const report = calculateCampaignReferralReport({
    totalBudget: Number(campaign?.totalBudget ?? 0),
    attributions: filteredAttributions.map((attribution) => ({
      referrerId: attribution.referrerId,
      referrerLabel: getCreatorLabel(attribution.referrer),
      referredUserId: attribution.referredUserId,
      clickedAt: attribution.clickedAt,
      signedUpAt: attribution.signedUpAt,
      onboardedAt: attribution.onboardedAt,
      discordLinkedAt: attribution.discordLinkedAt,
      socialConnectedAt: attribution.socialConnectedAt,
      firstSubmissionAt: attribution.firstSubmissionAt,
      activeAt: attribution.activeAt,
      earnedAmount: attribution.referredUserId
        ? (submissionStatsByCreator.get(attribution.referredUserId)?.earnedAmount ?? 0)
        : Number(attribution.firstEarnedAmount ?? 0),
    })),
  });

  const referrerRows = report.referrers.map((row) => {
    const rowAttributions = filteredAttributions.filter(
      (attribution) => attribution.referrerId === row.referrerId,
    );
    const rowReferredUserIds = Array.from(
      new Set(
        rowAttributions
          .map((attribution) => attribution.referredUserId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const submissionCount = rowReferredUserIds.reduce(
      (sum, id) => sum + (submissionStatsByCreator.get(id)?.count ?? 0),
      0,
    );
    const lastSubmissionAt = rowReferredUserIds.reduce<Date | null>(
      (latest, id) =>
        latestDate(latest, submissionStatsByCreator.get(id)?.lastSubmissionAt ?? null),
      null,
    );
    const sample = rowAttributions[0]?.referrer;

    return {
      ...row,
      referralCode: sample?.referralCode ?? "",
      email: sample?.email ?? "",
      discordUsername: sample?.discordUsername ?? null,
      submissionCount,
      lastActivityAt: latestDate(row.lastActivityAt, lastSubmissionAt),
    };
  });

  const selectedReferrerId =
    referrerRows.some((row) => row.referrerId === sp.referrer)
      ? sp.referrer
      : referrerRows[0]?.referrerId;
  const selectedReferrer = referrerRows.find(
    (row) => row.referrerId === selectedReferrerId,
  );
  const selectedAttributions = selectedReferrerId
    ? filteredAttributions.filter(
        (attribution) => attribution.referrerId === selectedReferrerId,
      )
    : [];
  const selectedBuckets = {
    clickedOnly: selectedAttributions.filter(
      (attribution) => getCampaignReferralBucket(attribution) === "clicked_only",
    ),
    inactiveInvite: selectedAttributions.filter(
      (attribution) => getCampaignReferralBucket(attribution) === "inactive_invite",
    ),
    activeInvite: selectedAttributions.filter(
      (attribution) => getCampaignReferralBucket(attribution) === "active_invite",
    ),
  };

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="ClipProfit"
        title="Referral rapportage"
        description="Campagne-attributie voor persoonlijke bio-links: clicks, onboarding-invites, submissions en approved/earned signalen."
      />

      <form action="/admin/referrals" className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 md:flex-row md:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Zoek op naam, email, Discord of referralcode"
            className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
          />
        </label>
        <button
          type="submit"
          className="h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Zoeken
        </button>
        {query ? (
          <Link href="/admin/referrals" className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-200 px-5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50">
            Reset
          </Link>
        ) : null}
      </form>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <StatCard label="Clicks" value={formatNumber(report.totalClicks)} detail="Alle persoonlijke linkbezoeken" />
        <StatCard label="Invites" value={formatNumber(report.inviteCount)} detail="Onboarding afgerond" />
        <StatCard label="Active clippers" value={formatNumber(report.activeClipperCount)} detail="Minimaal 1 submission" tone={report.activeClipperCount > 0 ? "success" : "neutral"} />
        <StatCard label="Inactive" value={formatNumber(report.inactiveClipperCount)} detail="Onboarded zonder submission" tone={report.inactiveClipperCount > 0 ? "warning" : "neutral"} />
        <StatCard label="Clicked only" value={formatNumber(report.clickedOnlyCount)} detail="Geen onboarding afgerond" />
      </div>

      <section>
        <SectionHeader
          title="Creators"
          description={`Default scope: ${campaign?.name ?? "ClipProfit"} campagne. Active clipper = onboarding afgerond en minimaal 1 submission.`}
        />
        <DataTable
          rows={referrerRows}
          rowKey={(row) => row.referrerId}
          rowHref={(row) => buildReferrerHref(row.referrerId, query)}
          emptyState={<EmptyState title="Geen referrers gevonden" description="Er zijn nog geen ClipProfit-campagne-attributies voor deze zoekopdracht." />}
          columns={[
            {
              key: "creator",
              header: "Creator",
              cell: (row) => (
                <div>
                  <p className="font-semibold text-neutral-950">{row.referrerLabel}</p>
                  <p className="mt-1 text-xs text-neutral-500">{row.email}</p>
                </div>
              ),
            },
            { key: "code", header: "Code", cell: (row) => <code className="text-xs font-semibold text-neutral-700">{row.referralCode || "-"}</code> },
            { key: "clicks", header: "Clicks", align: "right", cell: (row) => formatNumber(row.clicks) },
            { key: "invites", header: "Invites", align: "right", cell: (row) => formatNumber(row.inviteCount) },
            { key: "active", header: "Active", align: "right", cell: (row) => formatNumber(row.activeClipperCount) },
            { key: "inactive", header: "Inactive", align: "right", cell: (row) => formatNumber(row.inactiveClipperCount) },
            { key: "submissions", header: "Submissions", align: "right", cell: (row) => formatNumber(row.submissionCount) },
            { key: "activation", header: "Activation", align: "right", cell: (row) => `${Math.round(row.activationRate * 100)}%` },
            { key: "last", header: "Last activity", cell: (row) => formatShortDate(row.lastActivityAt, "nl") },
          ]}
        />
      </section>

      {selectedReferrer ? (
        <section>
          <SectionHeader
            title={`Drilldown: ${selectedReferrer.referrerLabel}`}
            description="Buckets laten exact zien waar elke invite vastzit: alleen klik, onboarding zonder submission, of actief met submission."
          />
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard label="Clicked only" value={formatNumber(selectedBuckets.clickedOnly.length)} detail="Klik of signup start, geen onboarding" />
            <StatCard label="Inactive invite" value={formatNumber(selectedBuckets.inactiveInvite.length)} detail="Onboarding afgerond, geen submission" tone={selectedBuckets.inactiveInvite.length > 0 ? "warning" : "neutral"} />
            <StatCard label="Active invite" value={formatNumber(selectedBuckets.activeInvite.length)} detail="Onboarding plus submission" tone={selectedBuckets.activeInvite.length > 0 ? "success" : "neutral"} />
          </div>

          <BucketTable
            title="Clicked only"
            bucket="clicked_only"
            rows={selectedBuckets.clickedOnly}
            submissionStatsByCreator={submissionStatsByCreator}
          />
          <BucketTable
            title="Inactive invites"
            bucket="inactive_invite"
            rows={selectedBuckets.inactiveInvite}
            submissionStatsByCreator={submissionStatsByCreator}
          />
          <BucketTable
            title="Active invites"
            bucket="active_invite"
            rows={selectedBuckets.activeInvite}
            submissionStatsByCreator={submissionStatsByCreator}
          />
        </section>
      ) : null}
    </div>
  );
}

function BucketTable({
  title,
  bucket,
  rows,
  submissionStatsByCreator,
}: {
  title: string;
  bucket: CampaignReferralBucket;
  rows: AttributionRow[];
  submissionStatsByCreator: Map<string, SubmissionStats>;
}) {
  return (
    <div className="mb-6">
      <SectionHeader title={title} />
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        emptyState={<EmptyState title="Geen records" description="Deze bucket is leeg voor de geselecteerde creator." />}
        columns={[
          {
            key: "user",
            header: "User",
            cell: (row) => (
              <div>
                <p className="font-semibold text-neutral-950">{getReferredLabel(row)}</p>
                <p className="mt-1 text-xs text-neutral-500">{row.referredUser?.email ?? row.clickId}</p>
              </div>
            ),
          },
          { key: "status", header: "Bucket", cell: () => <BucketBadge bucket={bucket} /> },
          { key: "clicked", header: "Clicked", cell: (row) => formatDate(row.clickedAt, "nl") },
          { key: "signup", header: "Signup started", cell: (row) => formatDate(row.signedUpAt, "nl") },
          { key: "onboarded", header: "Onboarded", cell: (row) => formatDate(row.onboardedAt, "nl") },
          { key: "discord", header: "Discord", cell: (row) => formatDate(row.discordLinkedAt, "nl") },
          { key: "firstSubmission", header: "First submission", cell: (row) => formatDate(row.firstSubmissionAt, "nl") },
          {
            key: "submissions",
            header: "Submissions",
            align: "right",
            cell: (row) =>
              formatNumber(
                row.referredUserId
                  ? (submissionStatsByCreator.get(row.referredUserId)?.count ?? 0)
                  : 0,
              ),
          },
          {
            key: "approved",
            header: "Approved/earned",
            cell: (row) => {
              const stats = row.referredUserId
                ? submissionStatsByCreator.get(row.referredUserId)
                : undefined;
              const isApproved = Boolean(row.activeAt || (stats?.approvedCount ?? 0) > 0);
              const earnedAmount =
                stats?.earnedAmount ?? Number(row.firstEarnedAmount ?? 0);

              return isApproved ? (
                <Badge variant="verified">
                  {formatCurrency(earnedAmount, "EUR", "nl")}
                </Badge>
              ) : (
                <Badge variant="neutral">Geen approved earning</Badge>
              );
            },
          },
        ]}
      />
    </div>
  );
}

function BucketBadge({ bucket }: { bucket: CampaignReferralBucket }) {
  if (bucket === "active_invite") {
    return <Badge variant="verified">Active invite</Badge>;
  }

  if (bucket === "inactive_invite") {
    return <Badge variant="pending">Inactive invite</Badge>;
  }

  return <Badge variant="neutral">Clicked only</Badge>;
}

function matchesReferrerSearch(attribution: AttributionRow, query: string) {
  const needle = query.toLowerCase();
  const fields = [
    attribution.referrer.email,
    attribution.referrer.discordUsername,
    attribution.referrer.referralCode,
    attribution.referrer.creatorProfile?.displayName,
    attribution.referrer.creatorProfile?.username,
  ];

  return fields.some((field) => field?.toLowerCase().includes(needle));
}

function getCreatorLabel(user: ReferralUser) {
  return (
    user.creatorProfile?.displayName ??
    user.creatorProfile?.username ??
    user.discordUsername ??
    user.email
  );
}

function getReferredLabel(row: AttributionRow) {
  if (!row.referredUser) return "Onbekende bezoeker";
  return getCreatorLabel({
    ...row.referredUser,
    referralCode: null,
  });
}

function buildSubmissionStatsByCreator(
  submissions: Array<{
    creatorId: string;
    status: string;
    earnedAmount: number | string | { toString(): string } | null;
    createdAt: Date;
  }>,
) {
  const stats = new Map<string, SubmissionStats>();

  for (const submission of submissions) {
    const current =
      stats.get(submission.creatorId) ??
      {
        count: 0,
        approvedCount: 0,
        earnedAmount: 0,
        lastSubmissionAt: null,
      };

    current.count += 1;
    if (submission.status === "APPROVED") {
      current.approvedCount += 1;
      current.earnedAmount += Number(submission.earnedAmount ?? 0);
    }
    current.lastSubmissionAt = latestDate(current.lastSubmissionAt, submission.createdAt);
    stats.set(submission.creatorId, current);
  }

  return stats;
}

function latestDate<T extends Date | string | null>(current: T, next: T): T {
  if (!next) return current;
  if (!current) return next;

  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
}

function buildReferrerHref(referrerId: string, query: string) {
  const params = new URLSearchParams({ referrer: referrerId });
  if (query) params.set("q", query);
  return `/admin/referrals?${params.toString()}`;
}

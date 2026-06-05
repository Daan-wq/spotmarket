import { Users } from "@/components/animate-ui/icons/users";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { prisma } from "@/lib/prisma";
import { VALID_METRIC_SNAPSHOT_WHERE } from "@/lib/metrics/valid-snapshots";
import { formatCurrencyPrecise, formatNumber, formatShortDate } from "@/lib/admin/agency-format";

export const dynamic = "force-dynamic";

export default async function ClippersPage() {
  const clippers = await prisma.creatorProfile.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      operationalProfile: true,
      user: {
        select: {
          email: true,
          campaignSubmissions: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              status: true,
              createdAt: true,
              earnedAmount: true,
              claimedViews: true,
              viewCount: true,
              likeCount: true,
              commentCount: true,
              shareCount: true,
              metricSnapshots: {
                where: VALID_METRIC_SNAPSHOT_WHERE,
                orderBy: { capturedAt: "desc" },
                take: 1,
                select: {
                  viewCount: true,
                  likeCount: true,
                  commentCount: true,
                  shareCount: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          igConnections: { where: { isVerified: true } },
          ttConnections: { where: { isVerified: true } },
          ytConnections: { where: { isVerified: true } },
          fbConnections: { where: { isVerified: true } },
        },
      },
    },
    take: 120,
  });

  const active = clippers.filter((clipper) => clipper.operationalProfile?.status === "ACTIVE");
  const missingOps = clippers.filter((clipper) => !clipper.operationalProfile);
  const totalCapacity = clippers.reduce((sum, clipper) => sum + (clipper.operationalProfile?.maxClipsPerWeek ?? 0), 0);
  const analytics = clippers.map((clipper) => buildClipperAnalytics(clipper));
  const totalTrackedViews = analytics.reduce((sum, row) => sum + row.views, 0);
  const totalTrackedPosts = analytics.reduce((sum, row) => sum + row.posts, 0);
  const totalEarnings = analytics.reduce((sum, row) => sum + row.earnings, 0);
  const totalAccounts = analytics.reduce((sum, row) => sum + row.verifiedConnections, 0);
  const analyticsByProfileId = new Map(analytics.map((row) => [row.profileId, row]));

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Creatoroperatie"
        title="Clippers"
        description="Clipperanalytics en operatie: gemeten views, engagement, clips, inkomsten, accounts en recente activiteit."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Gemeten views" value={formatNumber(totalTrackedViews)} detail={`${formatNumber(totalTrackedPosts)} ingediende clips`} />
        <StatCard label="Creatorinkomsten" value={formatCurrencyPrecise(totalEarnings)} detail="Goedgekeurde/ingediende inkomsten" />
        <StatCard label="Accounts" value={String(totalAccounts)} detail="Geverifieerde gekoppelde accounts" />
        <StatCard label="Ops-profiel ontbreekt" value={String(missingOps.length)} detail={`${active.length} actief, ${totalCapacity} clips/week capaciteit`} tone={missingOps.length > 0 ? "warning" : "neutral"} />
      </div>

      <section>
        <SectionHeader title="Clipperanalytics" description="Open een clipper om accountanalytics, posts, campagneactiviteit en uitbetalingscontext te bekijken." />
        <DataTable
          rows={clippers}
          rowKey={(clipper) => clipper.id}
          rowHref={(clipper) => `/admin/creators/${clipper.id}`}
          emptyState={<EmptyState icon={<Users className="h-5 w-5" />} title="Nog geen clippers" description="Creatorprofielen verschijnen hier. Voeg operationele profielen toe om creators naar een productiedatabase te brengen." />}
          columns={[
            {
              key: "clipper",
              header: "Clipper",
              cell: (clipper) => (
                <div>
                  <p className="font-semibold text-neutral-950">{clipper.displayName}</p>
                  <p className="mt-1 text-xs text-neutral-500">{clipper.user?.email || "Geen email"}</p>
                </div>
              ),
            },
            {
              key: "views",
              header: "Views",
              align: "right",
              cell: (clipper) => formatNumber(analyticsByProfileId.get(clipper.id)?.views ?? 0),
            },
            {
              key: "engagement",
              header: "Eng.",
              align: "right",
              cell: (clipper) => formatPercent(analyticsByProfileId.get(clipper.id)?.engagementRate ?? null),
            },
            {
              key: "clips",
              header: "Clips",
              align: "right",
              cell: (clipper) => {
                const row = analyticsByProfileId.get(clipper.id);
                return `${row?.approved ?? 0}/${row?.posts ?? 0}`;
              },
            },
            {
              key: "earnings",
              header: "Verdiend",
              align: "right",
              cell: (clipper) => formatCurrencyPrecise(analyticsByProfileId.get(clipper.id)?.earnings ?? 0),
            },
            {
              key: "accounts",
              header: "Accounts",
              align: "right",
              cell: (clipper) => analyticsByProfileId.get(clipper.id)?.verifiedConnections ?? 0,
            },
            {
              key: "last",
              header: "Laatste clip",
              cell: (clipper) => formatShortDate(analyticsByProfileId.get(clipper.id)?.lastSubmissionAt),
            },
          ]}
        />
      </section>
    </div>
  );
}

type ClipperWithAnalytics = {
  id: string;
  user: {
    campaignSubmissions: Array<{
      status: string;
      createdAt: Date;
      earnedAmount: number | string | { toString(): string } | null;
      claimedViews: number;
      viewCount: number | null;
      likeCount: number | null;
      commentCount: number | null;
      shareCount: number | null;
      metricSnapshots: Array<{
        viewCount: bigint;
        likeCount: number;
        commentCount: number;
        shareCount: number;
      }>;
    }>;
  } | null;
  _count: {
    igConnections: number;
    ttConnections: number;
    ytConnections: number;
    fbConnections: number;
  };
};

function buildClipperAnalytics(clipper: ClipperWithAnalytics) {
  const submissions = clipper.user?.campaignSubmissions ?? [];
  const totals = submissions.reduce(
    (acc, submission) => {
      const latest = submission.metricSnapshots[0];
      const views = Number(latest?.viewCount ?? submission.viewCount ?? submission.claimedViews ?? 0);
      const likes = latest?.likeCount ?? submission.likeCount ?? 0;
      const comments = latest?.commentCount ?? submission.commentCount ?? 0;
      const shares = latest?.shareCount ?? submission.shareCount ?? 0;

      acc.views += views;
      acc.engagements += likes + comments + shares;
      acc.earnings += Number(submission.earnedAmount ?? 0);
      if (submission.status === "APPROVED") acc.approved += 1;
      return acc;
    },
    { views: 0, engagements: 0, earnings: 0, approved: 0 },
  );

  return {
    profileId: clipper.id,
    posts: submissions.length,
    views: totals.views,
    engagementRate: totals.views > 0 ? (totals.engagements / totals.views) * 100 : null,
    approved: totals.approved,
    earnings: totals.earnings,
    verifiedConnections:
      clipper._count.igConnections +
      clipper._count.ttConnections +
      clipper._count.ytConnections +
      clipper._count.fbConnections,
    lastSubmissionAt: submissions[0]?.createdAt ?? null,
  };
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "-";
  return `${Math.round(value)}%`;
}

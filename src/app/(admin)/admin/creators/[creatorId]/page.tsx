import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { AccountsAnalyticsWorkspace, type AccountsAnalyticsSearchParams } from "@/components/creator-analytics/accounts-analytics-workspace";
import { ScoreCard } from "@/components/clipper-score/score-card";
import { getCreatorAccountStatusCopy } from "@/lib/creator-account-status";
import { prisma } from "@/lib/prisma";
import { parseRange } from "@/lib/stats/range";
import { getCreatorTopStatsForScope, type CreatorStatsScope } from "@/lib/stats/creator";
import { formatCurrencyPrecise, formatDate, formatNumber, formatShortDate, titleCaseEnum } from "@/lib/admin/agency-format";
import { getCreatorPayoutTotals, getCreatorPendingCount, getCreatorPlatformVerification } from "@/app/(creator)/creator/dashboard/_data";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ creatorId: string }>;
  searchParams: Promise<AccountsAnalyticsSearchParams>;
}

export default async function CreatorProfilePage({ params, searchParams }: PageProps) {
  const { creatorId } = await params;
  const sp = await searchParams;
  const range = parseRange(sp);

  const profile = await prisma.creatorProfile.findUnique({
    where: { id: creatorId },
    include: {
      user: { select: { id: true, email: true, createdAt: true } },
      igConnections: true,
      ttConnections: true,
      ytConnections: true,
      fbConnections: true,
      operationalProfile: true,
    },
  });
  if (!profile) return notFound();

  const profileScope: CreatorStatsScope = {
    userId: profile.user.id,
    creatorProfileId: profile.id,
  };

  const [stats, payouts, pendingSubmissions, platformVerification, activeCampaigns, recentSubmissions] =
    await Promise.all([
      getCreatorTopStatsForScope(profileScope, range),
      getCreatorPayoutTotals(profile.user.id),
      getCreatorPendingCount(profile.user.id),
      getCreatorPlatformVerification(profile.id),
      prisma.campaignApplication.findMany({
        where: {
          creatorProfileId: profile.id,
          status: { in: ["pending", "approved", "active"] },
        },
        orderBy: { appliedAt: "desc" },
        take: 8,
        select: {
          id: true,
          status: true,
          campaign: {
            select: {
              id: true,
              name: true,
              deadline: true,
              creatorCpv: true,
              platforms: true,
            },
          },
        },
      }),
      prisma.campaignSubmission.findMany({
        where: { creatorId: profile.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          campaign: { select: { id: true, name: true } },
          submissionSignals: {
            select: { id: true, type: true, severity: true, createdAt: true, resolvedAt: true },
          },
        },
      }),
    ]);

  const allSignals = recentSubmissions.flatMap((submission) =>
    submission.submissionSignals.map((signal) => ({
      ...signal,
      campaignName: submission.campaign.name,
      submissionId: submission.id,
    })),
  );
  allSignals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const accounts = buildAccounts(profile);
  const accountCount = accounts.length;
  const verifiedAccounts = accounts.filter((account) => account.isVerified).length;
  const accountStatus = getCreatorAccountStatusCopy({
    instagram: profile.igConnections.some((connection) => connection.isVerified),
    tiktok: profile.ttConnections.some((connection) => connection.isVerified),
    youtube: profile.ytConnections.some((connection) => connection.isVerified),
    facebook: profile.fbConnections.some((connection) => connection.isVerified),
  });

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Clipper analytics"
        title={profile.displayName}
        description={`${profile.user.email} - joined ${formatDate(profile.user.createdAt)} - ${accountStatus.value}`}
        actions={[{ label: "All clippers", href: "/admin/clippers" }]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Views" value={formatNumber(stats.totalViews.value)} detail={range.label} />
        <StatCard label="Engagement" value={formatNumber(stats.totalEngagement.value)} detail="Likes + comments + shares" />
        <StatCard label="Earnings" value={formatCurrencyPrecise(stats.totalEarnings.value)} detail={range.label} />
        <StatCard label="Accounts" value={`${verifiedAccounts}/${accountCount || 0}`} detail={`${platformVerification.verifiedCount}/${platformVerification.connectedCount || 0} platforms verified`} tone={verifiedAccounts > 0 ? "success" : "warning"} />
      </div>

      <section>
        <SectionHeader
          title="Account Analytics"
          description="The same analytics workspace the creator sees, scoped to this clipper and shown read-only for admins."
        />
        <AccountsAnalyticsWorkspace
          mode="admin"
          basePath={`/admin/creators/${profile.id}`}
          profileScope={profileScope}
          searchParams={sp}
          showHeader={false}
        />
      </section>

      <section>
        <SectionHeader
          title="Campaign Operations"
          description="Campaign, payout, review, account-health, and signal context for running active campaigns."
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <AdminPanel title="Payout summary">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <MiniStat label="Estimated" value={formatCurrencyPrecise(payouts.totalEarnings)} />
              <MiniStat label="Pending/final" value={formatCurrencyPrecise(payouts.availableBalance)} tone={payouts.hasUnpaidBalance ? "warning" : "neutral"} />
              <MiniStat label="Paid" value={formatCurrencyPrecise(payouts.totalPaid)} />
            </div>
          </AdminPanel>

          <AdminPanel title="Operational snapshot">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <MiniStat label="Active campaigns" value={String(activeCampaigns.length)} />
              <MiniStat label="Pending submissions" value={String(pendingSubmissions)} tone={pendingSubmissions > 0 ? "warning" : "neutral"} />
              <MiniStat label="Ops status" value={profile.operationalProfile ? titleCaseEnum(profile.operationalProfile.status) : "No ops"} tone={profile.operationalProfile ? "neutral" : "warning"} />
              <MiniStat label="Weekly capacity" value={String(profile.operationalProfile?.maxClipsPerWeek ?? "-")} />
            </div>
          </AdminPanel>

          <ScoreCard creatorProfileId={profile.id} variant="compact" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AdminPanel title="Active campaigns">
          {activeCampaigns.length === 0 ? (
            <EmptyLine>No active campaigns.</EmptyLine>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {activeCampaigns.map((application) => (
                <li key={application.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/campaigns/${application.campaign.id}`} className="block truncate text-sm font-semibold text-neutral-950 underline-offset-2 hover:underline">
                      {application.campaign.name}
                    </Link>
                    <p className="mt-1 text-xs text-neutral-500">
                      {formatCurrencyPrecise(Number(application.campaign.creatorCpv) * 1000)} CPM - due {formatShortDate(application.campaign.deadline)}
                    </p>
                  </div>
                  <Badge variant={application.status === "active" ? "verified" : "neutral"}>{application.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel title="Account health">
          {accounts.length === 0 ? (
            <EmptyLine>No platform accounts connected.</EmptyLine>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {accounts.map((account) => {
                const health = tokenHealth(account.expiresAt);
                return (
                  <li key={`${account.type}:${account.handle}`} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-950">
                        <span className="mr-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">
                          {account.type}
                        </span>
                        {account.handle}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {account.followers != null ? `${formatNumber(account.followers)} followers` : "No follower snapshot"}
                        {account.lastSyncedAt ? ` - last synced ${formatShortDate(account.lastSyncedAt)}` : ""}
                      </p>
                    </div>
                    <Badge variant={health.variant}>{health.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AdminPanel title="Recent submissions">
          {recentSubmissions.length === 0 ? (
            <EmptyLine>No submissions yet.</EmptyLine>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {recentSubmissions.slice(0, 20).map((submission) => (
                <li key={submission.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/campaigns/${submission.campaign.id}`} className="block truncate text-sm font-semibold text-neutral-950 underline-offset-2 hover:underline">
                      {submission.campaign.name}
                    </Link>
                    <p className="mt-1 text-xs text-neutral-500">
                      {formatShortDate(submission.createdAt)}
                      {submission.submissionSignals.length > 0 ? ` - ${submission.submissionSignals.length} signals` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-neutral-950">
                      {formatNumber(submission.eligibleViews ?? submission.viewCount ?? submission.claimedViews)} views
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">{formatCurrencyPrecise(submission.earnedAmount)}</p>
                  </div>
                  <Badge variant={submissionStatusVariant(submission.status)}>
                    {titleCaseEnum(submission.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel title="Signal history">
          {allSignals.length === 0 ? (
            <EmptyLine>No submission signals fired.</EmptyLine>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {allSignals.slice(0, 30).map((signal) => (
                <li key={signal.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-950">
                      {titleCaseEnum(signal.type)}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {signal.campaignName} - {formatShortDate(signal.createdAt)}
                      {signal.resolvedAt ? ` - resolved ${formatShortDate(signal.resolvedAt)}` : ""}
                    </p>
                  </div>
                  <Badge variant={signal.severity === "CRITICAL" ? "failed" : signal.severity === "WARN" ? "pending" : "neutral"}>
                    {signal.severity}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}

function AdminPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-neutral-950">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className={`rounded-xl border p-3 ${tone === "warning" ? "border-orange-200 bg-orange-50" : "border-neutral-200 bg-neutral-50"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="py-5 text-sm text-neutral-500">{children}</p>;
}

function buildAccounts(profile: {
  igConnections: Array<{ igUsername: string; followerCount: number | null; tokenExpiresAt: Date | null; isVerified: boolean; lastCheckedAt: Date | null; verifiedAt: Date | null }>;
  ttConnections: Array<{ username: string; followerCount: number | null; tokenExpiresAt: Date | null; isVerified: boolean; lastCheckedAt: Date | null; verifiedAt: Date | null }>;
  ytConnections: Array<{ channelName: string; subscriberCount: number | null; tokenExpiresAt: Date | null; isVerified: boolean; updatedAt: Date | null }>;
  fbConnections: Array<{ pageName: string; followerCount: number | null; tokenExpiresAt: Date | null; isVerified: boolean; lastCheckedAt: Date | null; verifiedAt: Date | null }>;
}) {
  return [
    ...profile.igConnections.map((connection) => ({
      type: "IG" as const,
      handle: `@${connection.igUsername}`,
      followers: connection.followerCount,
      expiresAt: connection.tokenExpiresAt,
      isVerified: connection.isVerified,
      lastSyncedAt: connection.lastCheckedAt ?? connection.verifiedAt,
    })),
    ...profile.ttConnections.map((connection) => ({
      type: "TT" as const,
      handle: `@${connection.username}`,
      followers: connection.followerCount,
      expiresAt: connection.tokenExpiresAt,
      isVerified: connection.isVerified,
      lastSyncedAt: connection.lastCheckedAt ?? connection.verifiedAt,
    })),
    ...profile.ytConnections.map((connection) => ({
      type: "YT" as const,
      handle: connection.channelName,
      followers: connection.subscriberCount,
      expiresAt: connection.tokenExpiresAt,
      isVerified: connection.isVerified,
      lastSyncedAt: connection.updatedAt,
    })),
    ...profile.fbConnections.map((connection) => ({
      type: "FB" as const,
      handle: connection.pageName,
      followers: connection.followerCount,
      expiresAt: connection.tokenExpiresAt,
      isVerified: connection.isVerified,
      lastSyncedAt: connection.lastCheckedAt ?? connection.verifiedAt,
    })),
  ];
}

function tokenHealth(expiresAt: Date | null): { label: string; variant: "verified" | "pending" | "failed" | "neutral" } {
  if (!expiresAt) return { label: "Unknown", variant: "neutral" };
  if (expiresAt.getTime() < Date.now()) return { label: "Expired", variant: "failed" };
  const days = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days < 7) return { label: `${Math.max(0, Math.round(days))}d left`, variant: "pending" };
  return { label: "Healthy", variant: "verified" };
}

function submissionStatusVariant(status: string) {
  if (status === "APPROVED") return "verified";
  if (status === "PENDING" || status === "NEEDS_REVISION") return "pending";
  if (status === "REJECTED" || status === "FLAGGED") return "failed";
  return "neutral";
}

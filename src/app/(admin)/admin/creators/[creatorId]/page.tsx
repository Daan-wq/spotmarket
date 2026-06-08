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
import { getSocialAccountSummariesForProfile, type SocialAccountsByPlatform } from "@/lib/social-account-summary";
import { CreatorConnectionHealthWarning } from "@/components/connection-health/creator-connection-health-warning";

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

  const [stats, payouts, pendingSubmissions, platformVerification, activeCampaigns, recentSubmissions, socialAccounts, connectionIncidents] =
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
      getSocialAccountSummariesForProfile(profile.id),
      prisma.connectionHealthIncident.findMany({
        where: { creatorProfileId: profile.id, resolvedAt: null },
        orderBy: { openedAt: "desc" },
        select: {
          id: true,
          connectionLabel: true,
          connectionType: true,
          providerMessage: true,
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

  const accounts = buildAccounts(socialAccounts);
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
        eyebrow="Clipperanalytics"
        title={profile.displayName}
        description={`${profile.user.email} - lid sinds ${formatDate(profile.user.createdAt)} - ${accountStatus.value}`}
        actions={[{ label: "Alle clippers", href: "/admin/clippers" }]}
      />

      <CreatorConnectionHealthWarning incidents={connectionIncidents} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Views" value={formatNumber(stats.totalViews.value)} detail={range.label} />
        <StatCard label="Engagement" value={formatNumber(stats.totalEngagement.value)} detail="Likes + reacties + shares" />
        <StatCard label="Inkomsten" value={formatCurrencyPrecise(stats.totalEarnings.value)} detail={range.label} />
        <StatCard label="Accounts" value={`${verifiedAccounts}/${accountCount || 0}`} detail={`${platformVerification.verifiedCount}/${platformVerification.connectedCount || 0} platforms geverifieerd`} tone={verifiedAccounts > 0 ? "success" : "warning"} />
      </div>

      <section>
        <SectionHeader
          title="Accountanalytics"
          description="Dezelfde analyticsworkspace die de creator ziet, gescoped naar deze clipper en read-only voor admins."
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
          title="Campagne-operatie"
          description="Campagne-, uitbetalings-, review-, accountgezondheids- en signaalcontext voor actieve campagnes."
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <AdminPanel title="Uitbetalingsoverzicht">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <MiniStat label="Geschat" value={formatCurrencyPrecise(payouts.totalEarnings)} />
              <MiniStat label="In behandeling/definitief" value={formatCurrencyPrecise(payouts.availableBalance)} tone={payouts.hasUnpaidBalance ? "warning" : "neutral"} />
              <MiniStat label="Betaald" value={formatCurrencyPrecise(payouts.totalPaid)} />
            </div>
          </AdminPanel>

          <AdminPanel title="Operationele snapshot">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <MiniStat label="Actieve campagnes" value={String(activeCampaigns.length)} />
              <MiniStat label="Inzendingen in behandeling" value={String(pendingSubmissions)} tone={pendingSubmissions > 0 ? "warning" : "neutral"} />
              <MiniStat label="Ops-status" value={profile.operationalProfile ? titleCaseEnum(profile.operationalProfile.status) : "Geen ops"} tone={profile.operationalProfile ? "neutral" : "warning"} />
              <MiniStat label="Weekcapaciteit" value={String(profile.operationalProfile?.maxClipsPerWeek ?? "-")} />
            </div>
          </AdminPanel>

          <ScoreCard creatorProfileId={profile.id} variant="compact" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AdminPanel title="Actieve campagnes">
          {activeCampaigns.length === 0 ? (
            <EmptyLine>Geen actieve campagnes.</EmptyLine>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {activeCampaigns.map((application) => (
                <li key={application.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/campaigns/${application.campaign.id}`} className="block truncate text-sm font-semibold text-neutral-950 underline-offset-2 hover:underline">
                      {application.campaign.name}
                    </Link>
                    <p className="mt-1 text-xs text-neutral-500">
                      {formatCurrencyPrecise(Number(application.campaign.creatorCpv) * 1_000_000)} CPM - deadline {formatShortDate(application.campaign.deadline)}
                    </p>
                  </div>
                  <Badge variant={application.status === "active" ? "verified" : "neutral"}>{application.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel title="Accountgezondheid">
          {accounts.length === 0 ? (
            <EmptyLine>Geen platformaccounts gekoppeld.</EmptyLine>
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
                        {account.audienceCount != null ? `${formatNumber(account.audienceCount)} ${account.countLabel}` : "Geen publieksnapshot"}
                        {account.lastSuccessfulRefreshAt ? ` - laatst ververst ${formatShortDate(account.lastSuccessfulRefreshAt)}` : ""}
                      </p>
                      {account.accountRefreshStatus === "FAILED" ? (
                        <p className="mt-1 text-xs text-red-600">
                          Verversen mislukt{account.lastRefreshErrorMessage ? `: ${account.lastRefreshErrorMessage}` : ""}
                        </p>
                      ) : null}
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
        <AdminPanel title="Recente inzendingen">
          {recentSubmissions.length === 0 ? (
            <EmptyLine>Nog geen inzendingen.</EmptyLine>
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
                      {submission.submissionSignals.length > 0 ? ` - ${submission.submissionSignals.length} signalen` : ""}
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

        <AdminPanel title="Signaalhistorie">
          {allSignals.length === 0 ? (
            <EmptyLine>Geen inzendingssignalen geactiveerd.</EmptyLine>
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
                      {signal.resolvedAt ? ` - opgelost ${formatShortDate(signal.resolvedAt)}` : ""}
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

function buildAccounts(accounts: SocialAccountsByPlatform) {
  return [
    ...accounts.ig,
    ...accounts.tt,
    ...accounts.yt,
    ...accounts.fb,
  ].map((account) => ({
    type: account.connectionType,
    handle: account.handle ?? account.label,
    audienceCount: account.audienceCount,
    countLabel: account.countLabel,
    expiresAt: account.tokenExpiresAt,
    isVerified: account.isVerified,
    accountRefreshStatus: account.accountRefreshStatus,
    lastSuccessfulRefreshAt: account.lastSuccessfulRefreshAt,
    lastRefreshErrorMessage: account.lastRefreshErrorMessage,
  }));
}

function tokenHealth(expiresAt: Date | null): { label: string; variant: "verified" | "pending" | "failed" | "neutral" } {
  if (!expiresAt) return { label: "Unknown", variant: "neutral" };
  if (expiresAt.getTime() < Date.now()) return { label: "Verlopen", variant: "failed" };
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

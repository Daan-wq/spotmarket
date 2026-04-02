import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TopHeader } from "@/components/dashboard/top-header";
import { EarningsChart } from "@/components/dashboard/earnings-chart";
import { StatCard } from "@/components/dashboard/stat-card";

const payoutStatusStyle: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: "var(--success-bg)", text: "var(--success)" },
  sent:      { bg: "var(--accent-bg)",  text: "var(--accent)"  },
  pending:   { bg: "var(--warning-bg)", text: "var(--warning-text)" },
  failed:    { bg: "var(--error-bg)",   text: "var(--error)"   },
};

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const activeTab = tabParam === "payouts" ? "payouts" : "overview";

  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: {
        include: {
          applications: {
            include: {
              payouts: { orderBy: { createdAt: "desc" } },
              campaign: { select: { name: true, creatorCpv: true, status: true } },
              posts: { include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } } },
            },
          },
          socialAccounts: {
            where: { isActive: true },
            orderBy: { followerCount: "desc" },
            include: {
              campaignApplicationPages: {
                include: {
                  application: {
                    include: {
                      campaign: { select: { name: true, creatorCpv: true, status: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const applications = user?.creatorProfile?.applications ?? [];

  // --- Stats ---
  const totalEarned = applications.reduce((sum, app) => {
    const paid = app.payouts.filter((p) => p.status === "confirmed" || p.status === "sent");
    return sum + paid.reduce((s, p) => s + parseFloat(p.amount.toString()), 0);
  }, 0);

  const pendingEarnings = applications.reduce((sum, app) => {
    const cpv = parseFloat(app.campaign.creatorCpv.toString());
    const views = app.posts.reduce((s, post) => s + (post.snapshots[0]?.viewsCount ?? 0), 0);
    const paid = app.payouts.filter((p) => p.status === "confirmed" || p.status === "sent");
    const paidAmount = paid.reduce((s, p) => s + parseFloat(p.amount.toString()), 0);
    return sum + Math.max(0, views * cpv - paidAmount);
  }, 0);

  const totalViews = applications.reduce((sum, app) => {
    return sum + app.posts.reduce((s, post) => s + (post.snapshots[0]?.viewsCount ?? 0), 0);
  }, 0);

  const activeCampaigns = applications.filter(
    (app) => app.campaign.status === "active" && (app.status === "approved" || app.status === "active")
  ).length;

  // --- Overview tab data ---
  const chartData = applications
    .filter((app) => app.posts.length > 0)
    .map((app) => {
      const cpv = parseFloat(app.campaign.creatorCpv.toString());
      const views = app.posts.reduce((s, post) => s + (post.snapshots[0]?.viewsCount ?? 0), 0);
      return {
        label: app.campaign.name.length > 12 ? app.campaign.name.slice(0, 12) + "..." : app.campaign.name,
        earned: views * cpv,
        views,
      };
    });

  const pages = user?.creatorProfile?.socialAccounts ?? [];
  const pageBreakdown = pages.map((page) => {
    const earned = page.campaignApplicationPages.reduce((s, ap) => s + ap.earnedAmount, 0);
    const views = page.campaignApplicationPages.reduce((s, ap) => s + ap.totalViews, 0);
    return {
      page,
      campaigns: page.campaignApplicationPages.length,
      totalViews: views,
      earned,
      status: page.campaignApplicationPages.some(
        (ap) => ap.application.campaign.status === "active"
      ) ? "Active" : "Idle",
    };
  });

  const grandTotalEarned = pageBreakdown.reduce((s, r) => s + r.earned, 0);
  const grandTotalViews = pageBreakdown.reduce((s, r) => s + r.totalViews, 0);
  const grandTotalCampaigns = pageBreakdown.reduce((s, r) => s + r.campaigns, 0);

  // --- Payouts tab data ---
  const allPayouts = applications.flatMap((app) =>
    app.payouts.map((p) => ({ ...p, campaignName: app.campaign.name }))
  );
  allPayouts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function formatViews(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return v.toString();
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-primary)" }}>
      <TopHeader title="Earnings" />

      <div className="flex-1 overflow-auto p-6">
        {/* Stats — always visible */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Earned"
            value={`$${totalEarned.toFixed(2)}`}
            sub={totalEarned > 0 ? "Paid out" : undefined}
            subPositive={totalEarned > 0}
          />
          <StatCard
            label="Pending"
            value={`$${pendingEarnings.toFixed(2)}`}
            sub={pendingEarnings > 0 ? "Awaiting payout" : undefined}
          />
          <StatCard
            label="Total Views"
            value={formatViews(totalViews)}
          />
          <StatCard
            label="Active Campaigns"
            value={String(activeCampaigns)}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-lg w-fit" style={{ background: "var(--muted)" }}>
          {(["overview", "payouts"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Link
                key={tab}
                href={tab === "overview" ? "/earnings" : "/earnings?tab=payouts"}
                className="px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all duration-150"
                style={{
                  background: isActive ? "var(--bg-elevated)" : "transparent",
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  boxShadow: isActive ? "var(--shadow-card)" : "none",
                }}
              >
                {tab === "overview" ? "Overview" : "Payouts"}
              </Link>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "overview" ? (
          <div className="space-y-6">
            {/* Chart */}
            <div
              className="rounded-xl p-5"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Earnings by Campaign
                </h2>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Based on verified views
                </p>
              </div>
              <EarningsChart data={chartData} />
            </div>

            {/* Campaign breakdown */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Campaign Breakdown
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {applications.length} campaign{applications.length !== 1 ? "s" : ""}
                </p>
              </div>
              {applications.length === 0 ? (
                <div className="px-5 py-12 text-center" style={{ background: "var(--bg-elevated)" }}>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No campaigns yet.</p>
                  <a href="/campaigns" className="text-sm font-medium mt-2 inline-block" style={{ color: "var(--accent)" }}>
                    Browse campaigns
                  </a>
                </div>
              ) : (
                <div style={{ background: "var(--bg-elevated)" }}>
                  {applications.map((app, i) => {
                    const cpv = parseFloat(app.campaign.creatorCpv.toString());
                    const views = app.posts.reduce((s, post) => s + (post.snapshots[0]?.viewsCount ?? 0), 0);
                    const estimated = views * cpv;
                    const statusColor = app.campaign.status === "active"
                      ? { bg: "var(--success-bg)", color: "var(--success)" }
                      : { bg: "var(--muted)", color: "var(--text-secondary)" };
                    return (
                      <div
                        key={app.id}
                        className="flex items-center justify-between px-5 py-4"
                        style={{ borderTop: i > 0 ? "1px solid var(--bg-secondary)" : undefined }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                            {app.campaign.name}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                            {views.toLocaleString()} views · ${(cpv * 1_000_000).toFixed(0)}/1M views
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: statusColor.bg, color: statusColor.color }}
                          >
                            {app.campaign.status}
                          </span>
                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            ${estimated.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Page breakdown */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Earnings by Page
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {pages.length} page{pages.length !== 1 ? "s" : ""}
                </p>
              </div>
              {pageBreakdown.length === 0 ? (
                <div className="px-5 py-12 text-center" style={{ background: "var(--bg-elevated)" }}>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No pages connected yet.</p>
                </div>
              ) : (
                <div style={{ background: "var(--bg-elevated)" }}>
                  {/* Table header */}
                  <div
                    className="grid px-5 py-2.5 text-xs font-semibold uppercase tracking-wide"
                    style={{
                      gridTemplateColumns: "1fr auto auto auto auto",
                      gap: "1rem",
                      borderBottom: "1px solid var(--border)",
                      background: "var(--bg-primary)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span>Page</span>
                    <span>Campaigns</span>
                    <span>Views</span>
                    <span>Earned</span>
                    <span>Status</span>
                  </div>

                  {/* Rows */}
                  {pageBreakdown.map((row, i) => (
                    <div
                      key={row.page.id}
                      className="grid items-center px-5 py-3"
                      style={{
                        gridTemplateColumns: "1fr auto auto auto auto",
                        gap: "1rem",
                        borderTop: i > 0 ? "1px solid var(--bg-secondary)" : undefined,
                      }}
                    >
                      <a
                        href={`/pages/${row.page.id}`}
                        className="text-sm font-medium"
                        style={{ color: "var(--accent)" }}
                      >
                        @{row.page.platformUsername}
                      </a>
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {row.campaigns}
                      </span>
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {formatViews(row.totalViews)}
                      </span>
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        €{(row.earned / 100).toFixed(2)}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: row.status === "Active" ? "var(--success-bg)" : "var(--muted)",
                          color: row.status === "Active" ? "var(--success-text)" : "var(--text-secondary)",
                        }}
                      >
                        {row.status}
                      </span>
                    </div>
                  ))}

                  {/* Totals row */}
                  {pageBreakdown.length > 1 && (
                    <div
                      className="grid items-center px-5 py-3 text-sm font-semibold"
                      style={{
                        gridTemplateColumns: "1fr auto auto auto auto",
                        gap: "1rem",
                        borderTop: "2px solid var(--border)",
                        background: "var(--bg-primary)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <span>Total</span>
                      <span>{grandTotalCampaigns}</span>
                      <span>{formatViews(grandTotalViews)}</span>
                      <span>€{(grandTotalEarned / 100).toFixed(2)}</span>
                      <span />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Payouts tab */
          <div>
            {allPayouts.length === 0 ? (
              <div
                className="rounded-xl px-6 py-16 text-center"
                style={{ border: "1px solid var(--border)", background: "var(--bg-elevated)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No payouts yet.</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Payouts are processed weekly once your earnings exceed the minimum threshold.
                </p>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {/* Header */}
                <div
                  className="grid gap-4 px-5 py-2.5"
                  style={{
                    gridTemplateColumns: "1fr auto auto auto",
                    background: "var(--bg-primary)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {["Campaign", "Type", "Date", "Amount"].map((h) => (
                    <p key={h} className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                      {h}
                    </p>
                  ))}
                </div>

                {/* Rows */}
                <div style={{ background: "var(--bg-elevated)" }}>
                  {allPayouts.map((payout, i) => {
                    const colors = payoutStatusStyle[payout.status] ?? { bg: "var(--muted)", text: "var(--text-secondary)" };
                    return (
                      <div
                        key={payout.id}
                        className="grid gap-4 items-center px-5 py-4"
                        style={{
                          gridTemplateColumns: "1fr auto auto auto",
                          borderTop: i > 0 ? "1px solid var(--bg-primary)" : undefined,
                        }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                            {payout.campaignName}
                          </p>
                          {payout.txHash && (
                            <p className="text-xs font-mono mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
                              {payout.txHash.slice(0, 18)}…
                            </p>
                          )}
                        </div>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                          style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
                        >
                          {payout.type}
                        </span>
                        <p className="text-sm whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                          {new Date(payout.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-2 justify-end">
                          <p className="text-sm font-semibold whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                            ${parseFloat(payout.amount.toString()).toFixed(2)}
                          </p>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                            style={{ background: colors.bg, color: colors.text }}
                          >
                            {payout.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

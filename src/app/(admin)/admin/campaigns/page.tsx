import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";
import { EmptyState } from "@/components/admin/empty-state";

const statusBadge: Record<string, { bg: string; text: string }> = {
  draft:            { bg: "bg-gray-100",   text: "text-gray-500" },
  pending_payment:  { bg: "bg-amber-50",   text: "text-amber-700" },
  pending_review:   { bg: "bg-blue-50",    text: "text-blue-700" },
  active:           { bg: "bg-green-50",   text: "text-green-700" },
  paused:           { bg: "bg-amber-50",   text: "text-amber-700" },
  completed:        { bg: "bg-gray-100",   text: "text-gray-500" },
  cancelled:        { bg: "bg-red-50",     text: "text-red-700" },
};

export default async function AdminCampaignsPage() {
  const [pendingReview, campaigns, activeCnt, pausedCnt, completedCnt] = await Promise.all([
    prisma.campaign.findMany({
      where: { status: "pending_review" },
      include: {
        createdBy: { include: { creatorProfile: { select: { displayName: true } } } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.campaign.findMany({
      where: { status: { notIn: ["pending_review"] } },
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.campaign.count({ where: { status: "active" } }),
    prisma.campaign.count({ where: { status: "paused" } }),
    prisma.campaign.count({ where: { status: "completed" } }),
  ]);

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Campaigns"
        subtitle="Manage brand campaigns and track performance"
        action={{ label: "+ Create campaign", href: "/admin/campaigns/new" }}
      />
      <StatCards
        stats={[
          { label: "Pending review", value: pendingReview.length },
          { label: "Active", value: activeCnt },
          { label: "Paused", value: pausedCnt },
          { label: "Completed", value: completedCnt },
        ]}
      />

      {/* Pending Review Queue */}
      {pendingReview.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
            Needs review ({pendingReview.length})
          </h2>
          <div className="bg-white rounded-lg border border-blue-200 divide-y divide-blue-50">
            {pendingReview.map((c) => {
              const ownerName = c.createdBy?.creatorProfile?.displayName ?? c.createdBy?.email ?? "Unknown";
              return (
                <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-blue-50/40">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold truncate text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      by {ownerName} · ${Number(c.totalBudget).toLocaleString()} USDT ·{" "}
                      {c.depositTxHash ? (
                        <a
                          href={`https://tronscan.org/#/transaction/${c.depositTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          Verify TX ↗
                        </a>
                      ) : (
                        <span className="text-red-500">No TX hash</span>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/admin/campaigns/${c.id}/review`}
                    className="shrink-0 ml-4 text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    Review →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All other campaigns */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-gray-100">
          {["Campaign", "Geo", "CPV", "Deadline", "Apps", "Status", ""].map((h) => (
            <p key={h} className="text-[13px] text-gray-400">{h}</p>
          ))}
        </div>

        {campaigns.length === 0 ? (
          <EmptyState
            icon={
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 0 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 1 8.835-2.535m0 0A23.74 23.74 0 0 1 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m-1.394-9.98a24.407 24.407 0 0 1 1.394 9.98" />
              </svg>
            }
            title="No campaigns yet"
            description="Create your first campaign to start matching brands with your page network."
            actions={[{ label: "+ Create campaign", href: "/admin/campaigns/new", variant: "primary" }]}
          />
        ) : (
          <div>
            {campaigns.map((c, i) => {
              const badge = statusBadge[c.status] ?? statusBadge.draft;
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-gray-50"
                  style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                    {c.targetGeo.join(", ") || "—"}
                  </span>
                  <p className="text-[14px] whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                    {Number(c.creatorCpv) > 0 ? `$${(Number(c.creatorCpv) * 1_000_000).toFixed(0)}/1M` : "—"}
                  </p>
                  <p className="text-[14px] whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                    {new Date(c.deadline).toLocaleDateString()}
                  </p>
                  <p className="text-[14px] whitespace-nowrap text-center" style={{ color: "var(--text-secondary)" }}>{c._count.applications}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${badge.bg} ${badge.text}`}>
                    {c.status.replace("_", " ")}
                  </span>
                  <Link href={`/admin/campaigns/${c.id}`} className="text-xs hover:underline whitespace-nowrap" style={{ color: "var(--accent)" }}>
                    View →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

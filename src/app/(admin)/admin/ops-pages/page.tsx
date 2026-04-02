import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MessageButton } from "@/components/admin/message-button";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";
import { EmptyState } from "@/components/admin/empty-state";
import { NicheBadge } from "@/components/admin/NicheSelector";
import { Niche, PageTier } from "@prisma/client";

type Channel = "whatsapp" | "telegram" | "instagram" | "email" | "signal";

const TIER_STYLES: Record<PageTier, { bg: string; color: string }> = {
  A: { bg: "var(--success-bg)", color: "var(--success)" },
  B: { bg: "#eff6ff", color: "#1d4ed8" },
  C: { bg: "var(--bg-secondary)", color: "var(--text-secondary)" },
};

function BacklogDot({ days }: { days: number }) {
  const color = days >= 30 ? "var(--success)" : days >= 14 ? "#f97316" : "var(--error)";
  return (
    <span
      title={`${days} dagen content backlog`}
      className="inline-block w-2 h-2 rounded-full"
      style={{ background: color }}
    />
  );
}

export default async function AdminOpsPages({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; niche?: string }>;
}) {
  const { tier, niche } = await searchParams;

  const pages = await prisma.instagramPage.findMany({
    where: {
      ...(tier ? { tierLevel: tier as PageTier } : {}),
      ...(niche ? { niche: niche as Niche } : {}),
    },
    include: { _count: { select: { internalCampaignPages: true } } },
    orderBy: [{ tierLevel: "asc" }, { followerCount: "desc" }],
  });

  const totalFollowers = pages.reduce((sum, p) => sum + p.followerCount, 0);
  const avgEngagement =
    pages.length > 0
      ? pages.reduce((sum, p) => sum + Number(p.avgEngagementRate), 0) / pages.length
      : 0;
  const onCampaigns = pages.filter((p) => p._count.internalCampaignPages > 0).length;
  const signedContracts = pages.filter((p) => p.contractStatus === "SIGNED").length;

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Internal Ops Pages"
        subtitle="Instagram and TikTok pages in your network"
        action={{ label: "+ Add page manually", href: "/admin/ops-pages/new" }}
      />
      <StatCards
        stats={[
          { label: "Total pages", value: pages.length },
          {
            label: "Combined followers",
            value:
              totalFollowers >= 1_000_000
                ? `${(totalFollowers / 1_000_000).toFixed(1)}M`
                : totalFollowers >= 1000
                ? `${(totalFollowers / 1000).toFixed(0)}K`
                : totalFollowers,
          },
          { label: "Avg. engagement", value: `${avgEngagement.toFixed(1)}%` },
          { label: "Signed contracts", value: `${signedContracts}/${pages.length}` },
          { label: "On active campaigns", value: onCampaigns },
        ]}
      />

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(["A", "B", "C"] as PageTier[]).map((t) => {
          const s = TIER_STYLES[t];
          return (
            <Link
              key={t}
              href={tier === t ? "/admin/ops-pages" : `/admin/ops-pages?tier=${t}`}
              className="text-xs px-3 py-1 rounded-full font-medium border transition-colors"
              style={
                tier === t
                  ? { background: s.bg, color: s.color, borderColor: s.color }
                  : { background: "var(--bg-card)", color: "var(--text-muted)", borderColor: "var(--border)" }
              }
            >
              Tier {t}
            </Link>
          );
        })}
        {([
          "FINANCE",
          "TECH",
          "MOTIVATION",
          "FOOD",
          "HUMOR",
          "LIFESTYLE",
          "CASINO",
        ] as Niche[]).map((n) => (
          <Link
            key={n}
            href={niche === n ? "/admin/ops-pages" : `/admin/ops-pages?niche=${n}`}
            className="text-xs px-3 py-1 rounded-full border transition-colors"
            style={
              niche === n
                ? { background: "var(--text-primary)", color: "#fff", borderColor: "var(--text-primary)" }
                : { background: "var(--bg-card)", color: "var(--text-muted)", borderColor: "var(--border)" }
            }
          >
            {n.charAt(0) + n.slice(1).toLowerCase()}
          </Link>
        ))}
        {(tier || niche) && (
          <Link href="/admin/ops-pages" className="text-xs text-gray-400 hover:text-gray-600 ml-1">
            × clear
          </Link>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-3 px-5 py-2.5 border-b border-gray-100">
          {["Tier", "Handle", "Niche", "Followers", "Eng.", "CPM", "Backlog", "Campaigns"].map((h) => (
            <p key={h} className="text-[13px] text-gray-400">
              {h}
            </p>
          ))}
        </div>

        {pages.length === 0 ? (
          <EmptyState
            icon={
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            }
            title="No pages found"
            description="Add pages manually or clear the active filters."
            actions={[{ label: "+ Add page manually", href: "/admin/ops-pages/new", variant: "primary" }]}
          />
        ) : (
          <div>
            {pages.map((page, i) => {
              const tierStyle = TIER_STYLES[page.tierLevel];
              return (
                <div
                  key={page.id}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-3 items-center px-5 py-3 hover:bg-gray-50"
                  style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
                >
                  {/* Tier */}
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
                    style={{ background: tierStyle.bg, color: tierStyle.color }}
                  >
                    {page.tierLevel}
                  </span>

                  {/* Handle */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Link
                      href={`/admin/ops-pages/${page.id}`}
                      className="text-[14px] font-medium text-gray-900 hover:underline truncate"
                    >
                      @{page.handle}
                    </Link>
                    {page.contractStatus !== "SIGNED" && (
                      <span title="Geen getekend contract" className="text-orange-400 text-xs">⚠️</span>
                    )}
                    {page.communicationHandle && (
                      <MessageButton
                        channel={(page.communicationChannel as Channel) || "instagram"}
                        handle={page.communicationHandle}
                      />
                    )}
                  </div>

                  {/* Niche */}
                  {page.niche ? (
                    <NicheBadge niche={page.niche} />
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}

                  {/* Followers */}
                  <p className="text-[14px] text-gray-900 whitespace-nowrap">
                    {page.followerCount >= 1000
                      ? `${(page.followerCount / 1000).toFixed(0)}K`
                      : String(page.followerCount)}
                  </p>

                  {/* Engagement */}
                  <p className="text-[14px] text-gray-500 whitespace-nowrap">
                    {Number(page.avgEngagementRate).toFixed(1)}%
                  </p>

                  {/* CPM */}
                  <p className="text-[14px] text-gray-500 whitespace-nowrap">
                    ${Number(page.avgCpm).toFixed(2)}
                  </p>

                  {/* Backlog */}
                  <div className="flex items-center gap-1.5">
                    <BacklogDot days={page.contentBacklogDays} />
                    <span className="text-[13px] text-gray-500">{page.contentBacklogDays}d</span>
                  </div>

                  {/* Campaigns */}
                  <p className="text-[14px] text-gray-500">{page._count.internalCampaignPages}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

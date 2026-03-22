import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MessageButton } from "@/components/admin/message-button";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";
import { EmptyState } from "@/components/admin/empty-state";

type Channel = "whatsapp" | "telegram" | "instagram" | "email" | "signal";

export default async function AdminOpsPages() {
  const pages = await prisma.instagramPage.findMany({
    include: { _count: { select: { internalCampaignPages: true } } },
    orderBy: { followerCount: "desc" },
  });

  const totalFollowers = pages.reduce((sum, p) => sum + p.followerCount, 0);
  const avgEngagement =
    pages.length > 0
      ? pages.reduce((sum, p) => sum + Number(p.avgEngagementRate), 0) / pages.length
      : 0;
  const onCampaigns = pages.filter((p) => p._count.internalCampaignPages > 0).length;

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
          { label: "On active campaigns", value: onCampaigns },
        ]}
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-gray-100">
          {["Handle", "Niche", "Followers", "Eng.", "CPM", "Campaigns"].map((h) => (
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
            title="No pages connected yet"
            description="Add pages manually, or share your invite link so page owners can connect their Instagram via OAuth."
            actions={[
              { label: "+ Add page manually", href: "/admin/ops-pages/new", variant: "primary" },
              { label: "Copy invite link", href: "#copy-invite", variant: "outline" },
            ]}
          />
        ) : (
          <div>
            {pages.map((page, i) => (
              <div
                key={page.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-gray-50"
                style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Link
                    href={`/admin/ops-pages/${page.id}`}
                    className="text-[14px] font-medium text-gray-900 hover:underline"
                  >
                    @{page.handle}
                  </Link>
                  {page.communicationHandle && (
                    <MessageButton
                      channel={(page.communicationChannel as Channel) || "instagram"}
                      handle={page.communicationHandle}
                    />
                  )}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
                  {page.niche ?? "—"}
                </span>
                <p className="text-[14px] text-gray-900 whitespace-nowrap">
                  {page.followerCount >= 1000
                    ? `${(page.followerCount / 1000).toFixed(0)}K`
                    : String(page.followerCount)}
                </p>
                <p className="text-[14px] text-gray-500 whitespace-nowrap">
                  {Number(page.avgEngagementRate).toFixed(1)}%
                </p>
                <p className="text-[14px] text-gray-500 whitespace-nowrap">
                  ${Number(page.avgCpm).toFixed(2)}
                </p>
                <p className="text-[14px] text-gray-500">{page._count.internalCampaignPages}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

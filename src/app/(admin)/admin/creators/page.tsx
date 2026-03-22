import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";
import { EmptyState } from "@/components/admin/empty-state";

export default async function AdminCreatorsPage() {
  const [creators, connectedCount, onCampaigns] = await Promise.all([
    prisma.creatorProfile.findMany({
      include: {
        user: { select: { email: true } },
        socialAccounts: {
          where: { isActive: true },
          select: { platform: true, platformUsername: true, followerCount: true, engagementRate: true },
        },
        _count: { select: { applications: true } },
      },
      orderBy: { totalFollowers: "desc" },
    }),
    prisma.creatorProfile.count({
      where: { socialAccounts: { some: { isActive: true } } },
    }),
    prisma.creatorProfile.count({
      where: { applications: { some: { status: { in: ["active", "approved"] } } } },
    }),
  ]);

  const avgFollowers =
    creators.length > 0
      ? Math.round(creators.reduce((sum, c) => sum + c.totalFollowers, 0) / creators.length)
      : 0;

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Creators"
        subtitle="Individual creators who have signed up to the platform"
      />
      <StatCards
        stats={[
          { label: "Total creators", value: creators.length },
          { label: "Connected (OAuth)", value: connectedCount },
          { label: "On campaigns", value: onCampaigns },
          {
            label: "Avg. followers",
            value: avgFollowers >= 1000 ? `${(avgFollowers / 1000).toFixed(0)}K` : avgFollowers,
          },
        ]}
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-gray-100">
          {["Creator", "Platform", "Followers", "Engagement", "Geo", "Campaigns", ""].map((h) => (
            <p key={h} className="text-[13px] text-gray-400">{h}</p>
          ))}
        </div>

        {creators.length === 0 ? (
          <EmptyState
            icon={
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            }
            title="No creators signed up yet"
            description="Creators will appear here when they sign up and connect their Instagram accounts."
            actions={[{ label: "Copy signup link", href: "#copy-signup", variant: "outline" }]}
          />
        ) : (
          <div>
            {creators.map((c, i) => {
              const ig = c.socialAccounts.find((a) => a.platform === "instagram");
              const tt = c.socialAccounts.find((a) => a.platform === "tiktok");
              const main = ig ?? tt;
              return (
                <Link
                  key={c.id}
                  href={`/admin/creators/${c.id}`}
                  className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-gray-50"
                  style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-gray-900 truncate">{c.displayName}</p>
                    <p className="text-[12px] text-gray-400 truncate">{c.user.email}</p>
                  </div>
                  <p className="text-[14px] truncate" style={{ color: main ? "#0f172a" : "#d97706" }}>
                    {main ? `@${main.platformUsername} (${main.platform})` : "Not connected"}
                  </p>
                  <p className="text-[14px] text-gray-900 whitespace-nowrap">{c.totalFollowers.toLocaleString()}</p>
                  <p className="text-[14px] text-gray-900 whitespace-nowrap">{c.engagementRate.toString()}%</p>
                  <p className="text-[14px] text-gray-500 whitespace-nowrap">{c.primaryGeo}</p>
                  <p className="text-[14px] text-gray-500 whitespace-nowrap text-center">{c._count.applications}</p>
                  <form action={`/api/creators/${c.id}/sync`} method="POST" onClick={(e) => e.stopPropagation()}>
                    <button type="submit" className="text-xs text-indigo-600 hover:underline whitespace-nowrap">
                      Sync stats
                    </button>
                  </form>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

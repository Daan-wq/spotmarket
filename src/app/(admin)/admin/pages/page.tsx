import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MessageButton } from "@/components/admin/message-button";

type Channel = "whatsapp" | "telegram" | "instagram" | "email" | "signal";

export default async function AdminPagesPage() {
  const pages = await prisma.instagramPage.findMany({
    include: { _count: { select: { internalCampaignPages: true } } },
    orderBy: { followerCount: "desc" },
  });

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>Instagram Pages</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>{pages.length} pages in network</p>
        </div>
        <Link
          href="/admin/pages/new"
          className="text-sm font-medium px-4 py-2 rounded-lg text-white"
          style={{ background: "#4f46e5" }}
        >
          + Add Page
        </Link>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
        <div
          className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5"
          style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}
        >
          {["Handle", "Niche", "Followers", "Eng.", "CPM", "Campaigns"].map((h) => (
            <p key={h} className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>
              {h}
            </p>
          ))}
        </div>

        {pages.length === 0 ? (
          <div className="px-5 py-12 text-center" style={{ background: "#ffffff" }}>
            <p className="text-sm" style={{ color: "#94a3b8" }}>No pages yet.</p>
          </div>
        ) : (
          <div style={{ background: "#ffffff" }}>
            {pages.map((page, i) => (
              <div
                key={page.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5"
                style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Link
                    href={`/admin/pages/${page.id}`}
                    className="text-sm font-medium hover:underline"
                    style={{ color: "#0f172a" }}
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
                <span
                  className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{ background: "#f3f4f6", color: "#6b7280" }}
                >
                  {page.niche ?? "—"}
                </span>
                <p className="text-sm whitespace-nowrap" style={{ color: "#0f172a" }}>
                  {page.followerCount >= 1000
                    ? `${(page.followerCount / 1000).toFixed(0)}K`
                    : String(page.followerCount)}
                </p>
                <p className="text-sm whitespace-nowrap" style={{ color: "#64748b" }}>
                  {Number(page.avgEngagementRate).toFixed(1)}%
                </p>
                <p className="text-sm whitespace-nowrap" style={{ color: "#64748b" }}>
                  ${Number(page.avgCpm).toFixed(2)}
                </p>
                <div className="flex items-center gap-1">
                  <p className="text-sm" style={{ color: "#64748b" }}>{page._count.internalCampaignPages}</p>
                  <div className="flex">
                    {Array.from({ length: Math.min(page.reliabilityScore, 10) }).map((_, j) => (
                      <div
                        key={j}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: page.reliabilityScore >= 7 ? "#22c55e" : page.reliabilityScore >= 4 ? "#f59e0b" : "#ef4444",
                          marginRight: 1,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

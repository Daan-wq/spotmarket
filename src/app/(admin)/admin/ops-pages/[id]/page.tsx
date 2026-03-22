import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MessageButton } from "@/components/admin/message-button";

type Channel = "whatsapp" | "telegram" | "instagram" | "email" | "signal";

export default async function AdminPageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const page = await prisma.instagramPage.findUnique({
    where: { id },
    include: {
      internalCampaignPages: {
        include: { internalCampaign: { select: { id: true, name: true, status: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!page) notFound();

  const totalPaid = page.payments
    .filter((p) => p.direction === "out" && (p.status === "confirmed" || p.status === "sent"))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const statusStyle: Record<string, { bg: string; color: string }> = {
    draft:     { bg: "#f3f4f6", color: "#6b7280" },
    confirmed: { bg: "#eff6ff", color: "#1d4ed8" },
    scheduled: { bg: "#f5f3ff", color: "#7c3aed" },
    live:      { bg: "#f0fdf4", color: "#15803d" },
    completed: { bg: "#f0fdf4", color: "#15803d" },
    cancelled: { bg: "#fef2f2", color: "#b91c1c" },
  };

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/admin/ops-pages" className="text-sm mb-4 inline-block" style={{ color: "#6b7280" }}>
        ← Back to Pages
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>@{page.handle}</h1>
          <div className="flex items-center gap-3 mt-1">
            {page.niche && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "#f3f4f6", color: "#6b7280" }}
              >
                {page.niche}
              </span>
            )}
            {page.country && (
              <span className="text-xs" style={{ color: "#94a3b8" }}>{page.country}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {page.communicationHandle && (
            <MessageButton
              channel={(page.communicationChannel as Channel) || "instagram"}
              handle={page.communicationHandle}
            />
          )}
          <Link
            href={`/admin/ops-pages/${id}/edit`}
            className="text-sm px-3 py-1.5 rounded-lg"
            style={{ background: "#f3f4f6", color: "#374151" }}
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "#e2e8f0" }}>
        <div className="px-5 py-4" style={{ background: "#ffffff" }}>
          <p className="text-2xl font-semibold" style={{ color: "#4f46e5" }}>
            {page.followerCount >= 1000
              ? `${(page.followerCount / 1000).toFixed(0)}K`
              : String(page.followerCount)}
          </p>
          <p className="text-xs mt-1" style={{ color: "#64748b" }}>Followers</p>
        </div>
        <div className="px-5 py-4" style={{ background: "#ffffff" }}>
          <p className="text-2xl font-semibold" style={{ color: "#0f172a" }}>
            {Number(page.avgEngagementRate).toFixed(1)}%
          </p>
          <p className="text-xs mt-1" style={{ color: "#64748b" }}>Avg Engagement</p>
        </div>
        <div className="px-5 py-4" style={{ background: "#ffffff" }}>
          <p className="text-2xl font-semibold" style={{ color: "#0f172a" }}>
            ${Number(page.avgCpm).toFixed(2)}
          </p>
          <p className="text-xs mt-1" style={{ color: "#64748b" }}>Avg CPM</p>
        </div>
        <div className="px-5 py-4" style={{ background: "#ffffff" }}>
          <div className="flex items-center gap-1.5">
            <p className="text-2xl font-semibold" style={{ color: "#0f172a" }}>{page.reliabilityScore}</p>
            <p className="text-sm" style={{ color: "#94a3b8" }}>/10</p>
          </div>
          <p className="text-xs mt-1" style={{ color: "#64748b" }}>Reliability</p>
        </div>
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "#e2e8f0" }}>
        {[
          { label: "Contact Name", value: page.contactName ?? "—" },
          { label: "Channel", value: page.communicationChannel },
          { label: "Handle / Number", value: page.communicationHandle ?? "—" },
        ].map((item) => (
          <div key={item.label} className="px-5 py-4" style={{ background: "#ffffff" }}>
            <p className="text-xs" style={{ color: "#94a3b8" }}>{item.label}</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: "#0f172a" }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "#e2e8f0" }}>
        <div className="px-5 py-4" style={{ background: "#ffffff" }}>
          <p className="text-2xl font-semibold" style={{ color: "#dc2626" }}>${totalPaid.toFixed(2)}</p>
          <p className="text-xs mt-1" style={{ color: "#64748b" }}>Total Paid Out</p>
        </div>
        <div className="px-5 py-4" style={{ background: "#ffffff" }}>
          <p className="text-2xl font-semibold" style={{ color: "#0f172a" }}>{page.internalCampaignPages.length}</p>
          <p className="text-xs mt-1" style={{ color: "#64748b" }}>Campaign Placements</p>
        </div>
      </div>

      {/* Notes */}
      {page.notes && (
        <div className="rounded-xl p-4 mb-8" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "#94a3b8" }}>NOTES</p>
          <p className="text-sm" style={{ color: "#374151" }}>{page.notes}</p>
        </div>
      )}

      {/* Campaign history */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid #e2e8f0" }}>
        <div className="px-5 py-3" style={{ borderBottom: "1px solid #f1f5f9", background: "#ffffff" }}>
          <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Campaign History</p>
        </div>
        {page.internalCampaignPages.length === 0 ? (
          <div className="px-5 py-8 text-center" style={{ background: "#ffffff" }}>
            <p className="text-sm" style={{ color: "#94a3b8" }}>No campaign placements yet.</p>
          </div>
        ) : (
          <div style={{ background: "#ffffff" }}>
            {page.internalCampaignPages.map((cp, i) => {
              const s = statusStyle[cp.internalCampaign.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
              return (
                <Link
                  key={cp.id}
                  href={`/admin/internal-campaigns/${cp.internalCampaign.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{cp.internalCampaign.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                      Cost: ${Number(cp.cost).toFixed(2)}
                      {cp.reach != null && ` · Reach: ${cp.reach.toLocaleString()}`}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {cp.internalCampaign.status}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

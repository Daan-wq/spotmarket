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
    draft:     { bg: "var(--bg-secondary)",  color: "var(--text-muted)" },
    confirmed: { bg: "var(--accent-bg)",     color: "var(--accent-foreground)" },
    scheduled: { bg: "var(--accent-bg)",     color: "var(--accent-foreground)" },
    live:      { bg: "var(--success-bg)",    color: "var(--success-text)" },
    completed: { bg: "var(--success-bg)",    color: "var(--success-text)" },
    cancelled: { bg: "var(--error-bg)",      color: "var(--error-text)" },
  };

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/admin/pages" className="text-sm mb-4 inline-block" style={{ color: "var(--text-secondary)" }}>
        ← Back to Pages
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>@{page.handle}</h1>
          <div className="flex items-center gap-3 mt-1">
            {page.niche && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
              >
                {page.niche}
              </span>
            )}
            {page.country && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{page.country}</span>
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
            href={`/admin/pages/${id}/edit`}
            className="text-sm px-3 py-1.5 rounded-lg"
            style={{ background: "var(--bg-secondary)", color: "var(--card-foreground)" }}
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "var(--border)" }}>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--accent)" }}>
            {page.followerCount >= 1000
              ? `${(page.followerCount / 1000).toFixed(0)}K`
              : String(page.followerCount)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Followers</p>
        </div>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            {Number(page.avgEngagementRate).toFixed(1)}%
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Avg Engagement</p>
        </div>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            ${Number(page.avgCpm).toFixed(2)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Avg CPM</p>
        </div>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <div className="flex items-center gap-1.5">
            <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{page.reliabilityScore}</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>/10</p>
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Reliability</p>
        </div>
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "var(--border)" }}>
        {[
          { label: "Contact Name", value: page.contactName ?? "—" },
          { label: "Channel", value: page.communicationChannel },
          { label: "Handle / Number", value: page.communicationHandle ?? "—" },
        ].map((item) => (
          <div key={item.label} className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.label}</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "var(--border)" }}>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--error)" }}>${totalPaid.toFixed(2)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Total Paid Out</p>
        </div>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{page.internalCampaignPages.length}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Campaign Placements</p>
        </div>
      </div>

      {/* Notes */}
      {page.notes && (
        <div className="rounded-xl p-4 mb-8" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>NOTES</p>
          <p className="text-sm" style={{ color: "var(--card-foreground)" }}>{page.notes}</p>
        </div>
      )}

      {/* Campaign history */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid var(--border)" }}>
        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Campaign History</p>
        </div>
        {page.internalCampaignPages.length === 0 ? (
          <div className="px-5 py-8 text-center" style={{ background: "var(--bg-elevated)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No campaign placements yet.</p>
          </div>
        ) : (
          <div style={{ background: "var(--bg-elevated)" }}>
            {page.internalCampaignPages.map((cp, i) => {
              const s = statusStyle[cp.internalCampaign.status] ?? { bg: "var(--bg-secondary)", color: "var(--text-secondary)" };
              return (
                <Link
                  key={cp.id}
                  href={`/admin/internal-campaigns/${cp.internalCampaign.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{cp.internalCampaign.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
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

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MessageButton } from "@/components/admin/message-button";

type Channel = "whatsapp" | "telegram" | "instagram" | "email" | "signal";

const statusStyle: Record<string, { bg: string; color: string }> = {
  draft:     { bg: "var(--bg-secondary)", color: "var(--text-secondary)" },
  confirmed: { bg: "var(--accent-bg)", color: "var(--accent)" },
  scheduled: { bg: "var(--accent-bg)", color: "var(--accent)" },
  live:      { bg: "var(--success-bg)", color: "var(--success)" },
  completed: { bg: "var(--success-bg)", color: "var(--success)" },
  cancelled: { bg: "var(--error-bg)", color: "var(--error-text)" },
  pending:   { bg: "var(--bg-secondary)", color: "var(--text-secondary)" },
  posted:    { bg: "var(--success-bg)", color: "var(--success)" },
};

export default async function AdminInternalCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const campaign = await prisma.internalCampaign.findUnique({
    where: { id },
    include: {
      client: true,
      campaignPages: {
        include: { page: true },
        orderBy: { createdAt: "asc" },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!campaign) notFound();

  const margin = Number(campaign.clientPays) - Number(campaign.totalPageCost);
  const marginPct = Number(campaign.clientPays) > 0
    ? (margin / Number(campaign.clientPays)) * 100
    : 0;

  const s = statusStyle[campaign.status] ?? { bg: "var(--bg-secondary)", color: "var(--text-muted)" };

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/admin/internal-campaigns" className="text-sm mb-4 inline-block" style={{ color: "var(--text-secondary)" }}>
        ← Back to Campaigns
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{campaign.name}</h1>
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-medium"
              style={{ background: s.bg, color: s.color }}
            >
              {campaign.status}
            </span>
          </div>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Client: {campaign.client.name}
            {campaign.startDate && ` · ${new Date(campaign.startDate).toLocaleDateString("en-GB")}`}
            {campaign.endDate && ` → ${new Date(campaign.endDate).toLocaleDateString("en-GB")}`}
          </p>
        </div>
        <Link
          href={`/admin/internal-campaigns/${id}/edit`}
          className="text-sm px-3 py-1.5 rounded-lg"
          style={{ background: "var(--bg-secondary)", color: "var(--card-foreground)" }}
        >
          Edit
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "var(--border)" }}>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--accent)" }}>
            ${Number(campaign.clientPays).toFixed(2)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Client Pays</p>
        </div>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            ${Number(campaign.totalPageCost).toFixed(2)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Total Page Cost</p>
        </div>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-2xl font-semibold" style={{ color: margin >= 0 ? "var(--success)" : "var(--error-text)" }}>
            ${margin.toFixed(2)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Margin</p>
        </div>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-2xl font-semibold" style={{ color: marginPct >= 20 ? "var(--success)" : "var(--warning-text)" }}>
            {marginPct.toFixed(1)}%
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Margin %</p>
        </div>
      </div>

      {/* Ad content */}
      {(campaign.adContentUrl || campaign.adCaption || campaign.adLink) && (
        <div className="rounded-xl p-4 mb-8" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>AD CONTENT</p>
          {campaign.adCaption && (
            <p className="text-sm mb-2" style={{ color: "var(--card-foreground)" }}>{campaign.adCaption}</p>
          )}
          <div className="flex gap-4">
            {campaign.adContentUrl && (
              <a
                href={campaign.adContentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline"
                style={{ color: "var(--accent)" }}
              >
                View Content
              </a>
            )}
            {campaign.adLink && (
              <a
                href={campaign.adLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline"
                style={{ color: "var(--accent)" }}
              >
                Ad Link
              </a>
            )}
          </div>
        </div>
      )}

      {/* Pages */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid var(--border)" }}>
        <div
          className="px-5 py-3"
          style={{ borderBottomColor: 'var(--border)', borderBottomWidth: '1px', background: "var(--bg-elevated)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Pages ({campaign.campaignPages.length})
          </p>
        </div>
        <div
          className="grid gap-4 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide"
          style={{
            gridTemplateColumns: "1fr auto auto auto auto auto",
            background: "var(--bg-primary)",
            borderBottomColor: 'var(--border)',
            borderBottomWidth: '1px',
            color: "var(--text-muted)",
          }}
        >
          {["Page", "Cost", "Status", "Scheduled", "Reach", "Contact"].map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
        {campaign.campaignPages.length === 0 ? (
          <div className="px-5 py-8 text-center" style={{ background: "var(--bg-elevated)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No pages assigned.</p>
          </div>
        ) : (
          <div style={{ background: "var(--bg-elevated)" }}>
            {campaign.campaignPages.map((cp, i) => {
              const ps = statusStyle[cp.status] ?? { bg: "var(--bg-secondary)", color: "var(--text-secondary)" };
              return (
                <div
                  key={cp.id}
                  className="grid items-center px-5 py-3.5 gap-4"
                  style={{
                    gridTemplateColumns: "1fr auto auto auto auto auto",
                    borderTop: i > 0 ? `1px solid var(--bg-primary)` : undefined,
                  }}
                >
                  <div>
                    <Link
                      href={`/admin/pages/${cp.page.id}`}
                      className="text-sm font-medium hover:underline"
                      style={{ color: "var(--text-primary)" }}
                    >
                      @{cp.page.handle}
                    </Link>
                    {cp.page.niche && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{cp.page.niche}</p>
                    )}
                  </div>
                  <p className="text-sm whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                    ${Number(cp.cost).toFixed(2)}
                  </p>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium"
                    style={{ background: ps.bg, color: ps.color }}
                  >
                    {cp.status}
                  </span>
                  <p className="text-xs whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                    {cp.scheduledDate
                      ? new Date(cp.scheduledDate).toLocaleDateString("en-GB")
                      : "—"}
                  </p>
                  <p className="text-sm whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                    {cp.reach != null ? cp.reach.toLocaleString() : "—"}
                  </p>
                  <div>
                    {cp.page.communicationHandle ? (
                      <MessageButton
                        channel={(cp.page.communicationChannel as Channel) || "instagram"}
                        handle={cp.page.communicationHandle}
                      />
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes */}
      {campaign.notes && (
        <div className="rounded-xl p-4 mb-8" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>NOTES</p>
          <p className="text-sm" style={{ color: "var(--card-foreground)" }}>{campaign.notes}</p>
        </div>
      )}

      {/* Payments */}
      {campaign.payments.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="px-5 py-3" style={{ borderBottomColor: 'var(--border)', borderBottomWidth: '1px', background: "var(--bg-elevated)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Payments</p>
          </div>
          <div style={{ background: "var(--bg-elevated)" }}>
            {campaign.payments.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-5 py-3"
                style={{ borderTop: i > 0 ? `1px solid var(--bg-primary)` : undefined }}
              >
                <div>
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                    {p.direction === "in" ? "↑ Received" : "↓ Paid out"}
                  </p>
                  {p.notes && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{p.notes}</p>
                  )}
                </div>
                <p
                  className="text-sm font-medium"
                  style={{ color: p.direction === "in" ? "var(--success)" : "var(--error-text)" }}
                >
                  {p.direction === "in" ? "+" : "-"}${Number(p.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

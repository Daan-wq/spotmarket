import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PublishButton } from "./_components/publish-button";

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    include: { advertiser: { select: { brandName: true } }, applications: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>All Campaigns</h1>
          <p style={{ color: "var(--text-secondary)" }}>Monitor and manage all campaigns</p>
        </div>
        <Link
          href="/admin/campaigns/new"
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            background: "var(--accent, #534AB7)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "14px",
            textDecoration: "none",
          }}
        >
          + Create Campaign
        </Link>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Advertiser</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Budget</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Creators</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Discord</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{c.name}</td>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{c.advertiser?.brandName || "-"}</td>
                <td className="px-6 py-3 text-sm">
                  <span className="px-2 py-1 rounded text-xs" style={{ background: c.status === "active" ? "var(--success-bg)" : "var(--warning-bg)", color: c.status === "active" ? "var(--success-text)" : "var(--warning-text)" }}>
                    {c.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>${(c.totalBudget?.toNumber?.() ?? 0).toFixed(2)}</td>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{c.applications.length}</td>
                <td className="px-6 py-3 text-sm">
                  <PublishButton campaignId={c.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import Link from "next/link";

const statusStyle: Record<string, { backgroundColor: string; color: string }> = {
  draft:     { backgroundColor: "#f1f5f9", color: "#475569" },
  active:    { backgroundColor: "#f0fdf4", color: "#15803d" },
  paused:    { backgroundColor: "#f5f3ff", color: "#7c3aed" },
  completed: { backgroundColor: "#eff6ff", color: "#1d4ed8" },
  cancelled: { backgroundColor: "#fef2f2", color: "#b91c1c" },
};

export default async function AdminCampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      businessProfile: { select: { companyName: true } },
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>Campaigns</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>{campaigns.length} total</p>
        </div>
        <Link
          href="/admin/campaigns/new"
          className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors"
          style={{ background: "#4f46e5" }}
        >
          + New Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-xl px-6 py-16 text-center" style={{ border: "1px solid #e2e8f0", background: "#ffffff" }}>
          <p className="text-sm" style={{ color: "#94a3b8" }}>
            No campaigns yet.{" "}
            <Link href="/admin/campaigns/new" style={{ color: "#4f46e5" }} className="hover:underline">
              Create your first campaign.
            </Link>
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
          {/* Header */}
          <div
            className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5"
            style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}
          >
            {["Campaign", "Geo", "CPV", "Deadline", "Apps", "Status", ""].map((h) => (
              <p key={h} className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>{h}</p>
            ))}
          </div>

          {/* Rows */}
          <div style={{ background: "#ffffff" }}>
            {campaigns.map((c, i) => {
              const colors = statusStyle[c.status] ?? { backgroundColor: "#f1f5f9", color: "#475569" };
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-4"
                  style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#0f172a" }}>{c.name}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "#94a3b8" }}>{c.businessProfile.companyName}</p>
                  </div>

                  <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ background: "#eef2ff", color: "#3730a3" }}>
                    {c.targetGeo.join(", ")}
                  </span>

                  <p className="text-sm whitespace-nowrap" style={{ color: "#0f172a" }}>${c.creatorCpv.toString()}</p>

                  <p className="text-sm whitespace-nowrap" style={{ color: "#64748b" }}>
                    {new Date(c.deadline).toLocaleDateString()}
                  </p>

                  <p className="text-sm whitespace-nowrap text-center" style={{ color: "#64748b" }}>
                    {c._count.applications}
                  </p>

                  <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={colors}>
                    {c.status}
                  </span>

                  <Link
                    href={`/admin/campaigns/${c.id}`}
                    className="text-xs font-medium hover:underline whitespace-nowrap"
                    style={{ color: "#4f46e5" }}
                  >
                    View →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

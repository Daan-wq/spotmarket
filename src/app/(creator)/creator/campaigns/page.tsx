import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CampaignsPage() {
  await requireAuth("creator");

  const campaigns = await prisma.campaign.findMany({
    where: { status: "active" },
    select: {
      id: true,
      name: true,
      description: true,
      creatorCpv: true,
      goalViews: true,
      deadline: true,
      targetGeo: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
        Active Campaigns
      </h1>

      {campaigns.length === 0 ? (
        <div
          className="rounded-lg p-12 text-center border"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <p style={{ color: "var(--text-secondary)" }}>No active campaigns available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/creator/campaigns/${campaign.id}`}
            >
              <div
                className="rounded-lg p-6 border cursor-pointer hover:border-opacity-100 transition-all"
                style={{
                  background: "var(--bg-card)",
                  borderColor: "var(--border)",
                }}
              >
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {campaign.name}
                </h3>
                <p
                  className="text-sm mb-4"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {campaign.description}
                </p>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-secondary)" }}>CPV:</span>
                    <span style={{ color: "var(--text-primary)" }}>
                      ${Number(campaign.creatorCpv).toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-secondary)" }}>Goal Views:</span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {campaign.goalViews?.toString() || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-secondary)" }}>Deadline:</span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {campaign.deadline ? new Date(campaign.deadline).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-secondary)" }}>Geo:</span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {campaign.targetGeo?.join(", ") || "Global"}
                    </span>
                  </div>
                </div>

                <button
                  className="w-full py-2 rounded font-medium transition-colors"
                  style={{
                    background: "var(--primary)",
                    color: "#fff",
                  }}
                >
                  View Details
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

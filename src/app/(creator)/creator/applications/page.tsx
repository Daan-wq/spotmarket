import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ApplicationsPage() {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) throw new Error("Creator profile not found");

  const applications = await prisma.campaignApplication.findMany({
    where: { creatorProfileId: profile.id },
    include: { campaign: { select: { name: true } } },
    orderBy: { appliedAt: "desc" },
  });

  const getStatusColor = (status: string) => {
    if (status === "approved" || status === "active") return "#22c55e";
    if (status === "pending") return "#f59e0b";
    if (status === "rejected") return "#ef4444";
    return "#64748b";
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        My Applications
      </h1>

      {applications.length === 0 ? (
        <div
          className="rounded-lg p-12 text-center border"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <p style={{ color: "var(--text-secondary)" }}>
            You haven&apos;t applied to any campaigns yet
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <table className="w-full text-sm">
            <thead
              style={{
                borderBottomColor: "var(--border)",
                backgroundColor: "rgba(99, 102, 241, 0.05)",
              }}
              className="border-b"
            >
              <tr style={{ color: "var(--text-secondary)" }}>
                <th className="text-left py-4 px-6">Campaign</th>
                <th className="text-left py-4 px-6">Status</th>
                <th className="text-left py-4 px-6">Earned</th>
                <th className="text-left py-4 px-6">Applied</th>
                <th className="text-left py-4 px-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr
                  key={app.id}
                  style={{ borderBottomColor: "var(--border)" }}
                  className="border-b last:border-b-0 hover:bg-opacity-50 transition-colors"
                >
                  <td className="py-4 px-6" style={{ color: "var(--text-primary)" }}>
                    {app.campaign.name}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className="px-3 py-1 rounded text-xs font-medium"
                      style={{
                        color: getStatusColor(app.status),
                        backgroundColor: `${getStatusColor(app.status)}20`,
                      }}
                    >
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-4 px-6" style={{ color: "var(--text-secondary)" }}>
                    ${(app.earnedAmount / 100).toFixed(2)}
                  </td>
                  <td className="py-4 px-6" style={{ color: "var(--text-secondary)" }}>
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6">
                    <Link
                      href={`/creator/applications/${app.id}`}
                      className="text-sm font-medium transition-colors"
                      style={{ color: "var(--primary)" }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

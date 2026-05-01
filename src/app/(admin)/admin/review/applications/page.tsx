import { prisma } from "@/lib/prisma";
import { DecisionActions } from "../_components/decision-actions";

export default async function ReviewApplicationsPage() {
  const applications = await prisma.campaignApplication.findMany({
    where: { status: "pending" },
    orderBy: { appliedAt: "asc" },
    include: {
      campaign: { select: { name: true, platform: true } },
      creatorProfile: {
        select: {
          displayName: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  if (applications.length === 0) {
    return (
      <div className="rounded-lg p-8 border text-center" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No pending join requests.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Campaign</th>
            <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Creator</th>
            <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Followers</th>
            <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Engagement</th>
            <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Applied</th>
            <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((a) => (
            <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                {a.campaign.name}
                <span className="block text-[11px]" style={{ color: "var(--text-muted)" }}>{a.campaign.platform}</span>
              </td>
              <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                {a.creatorProfile?.displayName ?? "—"}
                {a.creatorProfile?.user?.email && (
                  <span className="block text-[11px]" style={{ color: "var(--text-muted)" }}>{a.creatorProfile.user.email}</span>
                )}
              </td>
              <td className="px-6 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                {a.followerSnapshot != null ? a.followerSnapshot.toLocaleString() : "—"}
              </td>
              <td className="px-6 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                {a.engagementSnapshot != null ? `${Number(a.engagementSnapshot).toFixed(2)}%` : "—"}
              </td>
              <td className="px-6 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                {new Date(a.appliedAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-3">
                <DecisionActions kind="applications" id={a.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

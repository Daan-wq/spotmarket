import { prisma } from "@/lib/prisma";

const statAccent: Record<string, string> = {
  "Active Campaigns": "#4f46e5",
  "Total Creators":   "#16a34a",
  "Pending Applications": "#d97706",
  "Pending Payouts":  "#7c3aed",
};

export default async function AdminDashboard() {
  const [campaigns, creators, pendingApplications, pendingPayouts] =
    await Promise.all([
      prisma.campaign.count({ where: { status: "active" } }),
      prisma.creatorProfile.count(),
      prisma.campaignApplication.count({ where: { status: "pending" } }),
      prisma.payout.count({ where: { status: "pending" } }),
    ]);

  const stats = [
    { label: "Active Campaigns",      value: campaigns },
    { label: "Total Creators",        value: creators },
    { label: "Pending Applications",  value: pendingApplications },
    { label: "Pending Payouts",       value: pendingPayouts },
  ];

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>Admin Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Platform overview.</p>
      </div>

      <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden" style={{ background: "#e2e8f0" }}>
        {stats.map(({ label, value }) => (
          <div key={label} className="px-6 py-5" style={{ background: "#ffffff" }}>
            <p className="text-2xl font-semibold" style={{ color: statAccent[label] ?? "#0f172a" }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: "#64748b" }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import { prisma } from "@/lib/prisma";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl px-4 py-[14px]" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="text-[22px] font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>{value}</p>
    </div>
  );
}

function formatCurrency(val: any): string {
  const num = val?.toNumber?.() ?? Number(val) ?? 0;
  return "$" + num.toFixed(2);
}

export default async function AdminDashboard() {
  const [tc, ta, ac, rev, earn, spend, subs] = await Promise.all([
    prisma.creatorProfile.count(),
    prisma.advertiserProfile.count(),
    prisma.campaign.count({ where: { status: "active" } }),
    prisma.campaign.aggregate({ _sum: { adminMargin: true }, where: { status: "active" } }),
    prisma.campaignSubmission.aggregate({ _sum: { earnedAmount: true }, where: { status: "APPROVED" } }),
    prisma.campaign.aggregate({ _sum: { totalBudget: true }, where: { status: "active" } }),
    prisma.campaignSubmission.findMany({ take: 10, orderBy: { createdAt: "desc" }, include: { campaign: { select: { name: true } }, creator: { select: { email: true } } } }),
  ]);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Platform overview</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Creators" value={tc} />
        <StatCard label="Total Advertisers" value={ta} />
        <StatCard label="Active Campaigns" value={ac} />
        <StatCard label="Platform Revenue" value={formatCurrency(rev._sum.adminMargin)} />
        <StatCard label="Creator Earnings" value={formatCurrency(earn._sum.earnedAmount)} />
        <StatCard label="Brand Spend" value={formatCurrency(spend._sum.totalBudget)} />
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="p-6" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Recent Submissions</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Campaign</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Creator</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{s.campaign.name}</td>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{s.creator.email}</td>
                <td className="px-6 py-3 text-sm"><span className="px-2 py-1 rounded text-xs" style={{ background: s.status === "APPROVED" ? "var(--success-bg)" : "var(--warning-bg)", color: s.status === "APPROVED" ? "var(--success-text)" : "var(--warning-text)" }}>{s.status}</span></td>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{s.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { prisma } from "@/lib/prisma";

export default async function AdvertisersPage() {
  const advertisers = await prisma.advertiserProfile.findMany({
    include: { user: { select: { email: true, createdAt: true } }, campaigns: { select: { id: true, totalBudget: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Advertisers</h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Manage advertiser accounts</p>
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Brand Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Campaigns</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Total Spend</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {advertisers.map((a) => {
              const spend = a.campaigns.reduce((sum, c) => sum + (c.totalBudget?.toNumber?.() ?? 0), 0);
              return (
                <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{a.brandName}</td>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{a.user.email}</td>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{a.campaigns.length}</td>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>${spend.toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{a.user.createdAt.toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

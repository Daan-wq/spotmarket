import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function CreatorsPage() {
  const creators = await prisma.creatorProfile.findMany({
    include: { igConnections: { select: { isVerified: true, igUsername: true }, where: { isVerified: true }, take: 1 }, applications: { where: { campaign: { status: "active" } } } },
    orderBy: { totalFollowers: "desc" },
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Creators</h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Manage creator accounts</p>
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>IG Username</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Verified</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Followers</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Active Campaigns</th>
            </tr>
          </thead>
          <tbody>
            {creators.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                  <Link href={`/admin/creators/${c.id}`} className="underline">
                    {c.displayName}
                  </Link>
                </td>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{c.igConnections[0]?.igUsername || "-"}</td>
                <td className="px-6 py-3 text-sm"><span className="px-2 py-1 rounded text-xs" style={{ background: c.isVerified ? "var(--success-bg)" : "var(--warning-bg)", color: c.isVerified ? "var(--success-text)" : "var(--warning-text)" }}>{c.isVerified ? "Yes" : "No"}</span></td>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{c.totalFollowers.toLocaleString()}</td>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{c.applications.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

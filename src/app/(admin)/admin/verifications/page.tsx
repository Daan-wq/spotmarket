import { prisma } from "@/lib/prisma";
import VerificationActions from "./_components/verification-actions";

export default async function VerificationsPage() {
  const connections = await prisma.creatorIgConnection.findMany({
    include: { creatorProfile: { select: { displayName: true } }, bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Verifications</h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Manage creator verifications</p>
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Creator</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>IG Username</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {connections.map((c) => {
              const bio = c.bioVerifications[0];
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{c.creatorProfile.displayName}</td>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{c.igUsername}</td>
                  <td className="px-6 py-3 text-sm"><span className="px-2 py-1 rounded text-xs" style={{ background: c.isVerified ? "var(--success-bg)" : bio?.status === "PENDING" ? "var(--warning-bg)" : "var(--error-bg)", color: c.isVerified ? "var(--success-text)" : bio?.status === "PENDING" ? "var(--warning-text)" : "var(--error-text)" }}>{c.isVerified ? "VERIFIED" : bio?.status || "PENDING"}</span></td>
                  <td className="px-6 py-3 text-sm"><VerificationActions id={c.id} isVerified={c.isVerified} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

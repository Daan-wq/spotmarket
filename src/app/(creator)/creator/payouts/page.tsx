import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function PayoutsPage() {
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

  const payouts = await prisma.payout.findMany({
    where: { creatorProfileId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  // Calculate balance
  const allSubmissions = await prisma.campaignSubmission.findMany({
    where: { creatorId: user.id },
  });

  const totalEarned = allSubmissions.reduce((sum, sub) => sum + Number(sub.earnedAmount), 0);
  const totalPaid = payouts
    .filter((p) => p.status === "confirmed" || p.status === "sent")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = totalEarned - totalPaid;

  const getStatusColor = (status: string) => {
    if (status === "confirmed" || status === "sent") return "#22c55e";
    if (status === "processing") return "#f59e0b";
    if (status === "pending") return "#6366F1";
    if (status === "failed") return "#ef4444";
    return "#64748b";
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        Payouts
      </h1>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div
          className="rounded-lg p-6 border"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-2">
            Total Earned
          </p>
          <p style={{ color: "var(--primary)" }} className="text-2xl font-bold">
            ${totalEarned.toFixed(2)}
          </p>
        </div>

        <div
          className="rounded-lg p-6 border"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-2">
            Total Paid
          </p>
          <p style={{ color: "var(--success)" }} className="text-2xl font-bold">
            ${totalPaid.toFixed(2)}
          </p>
        </div>

        <div
          className="rounded-lg p-6 border"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-2">
            Available Balance
          </p>
          <p
            style={{ color: balance > 0 ? "var(--warning)" : "var(--text-secondary)" }}
            className="text-2xl font-bold"
          >
            ${balance.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Payout History */}
      {payouts.length === 0 ? (
        <div
          className="rounded-lg p-12 text-center border"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <p style={{ color: "var(--text-secondary)" }}>
            No payouts yet
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
                <th className="text-left py-4 px-6">Date</th>
                <th className="text-left py-4 px-6">Amount</th>
                <th className="text-left py-4 px-6">Type</th>
                <th className="text-left py-4 px-6">Status</th>
                <th className="text-left py-4 px-6">Method</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr
                  key={payout.id}
                  style={{ borderBottomColor: "var(--border)" }}
                  className="border-b last:border-b-0"
                >
                  <td className="py-4 px-6" style={{ color: "var(--text-secondary)" }}>
                    {new Date(payout.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6" style={{ color: "var(--text-primary)" }}>
                    ${Number(payout.amount).toFixed(2)}
                  </td>
                  <td className="py-4 px-6" style={{ color: "var(--text-secondary)" }}>
                    {payout.type.charAt(0).toUpperCase() + payout.type.slice(1)}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className="px-3 py-1 rounded text-xs font-medium"
                      style={{
                        color: getStatusColor(payout.status),
                        backgroundColor: `${getStatusColor(payout.status)}20`,
                      }}
                    >
                      {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-4 px-6" style={{ color: "var(--text-secondary)" }}>
                    {payout.paymentMethod || "N/A"}
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

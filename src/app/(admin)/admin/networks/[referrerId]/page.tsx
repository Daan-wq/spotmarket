import Link from "next/link";
import { checkRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

interface ReferrerDetailPageProps {
  params: {
    referrerId: string;
  };
}

export default async function ReferrerDetailPage({
  params,
}: ReferrerDetailPageProps) {
  const isAdmin = await checkRole("admin");
  if (!isAdmin) {
    redirect("/");
  }

  const referrer = await prisma.user.findUnique({
    where: { id: params.referrerId },
    select: {
      id: true,
      email: true,
      referralCode: true,
      referralEarnings: true,
      creatorProfile: { select: { displayName: true } },
    },
  });

  if (!referrer) {
    redirect("/admin/networks");
  }

  const referrals = await prisma.user.findMany({
    where: { referredBy: params.referrerId },
    select: {
      id: true,
      email: true,
      createdAt: true,
      creatorProfile: { select: { displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const payouts = await prisma.referralPayout.findMany({
    where: { referrerId: params.referrerId },
    orderBy: { createdAt: "desc" },
  });

  const pendingPayouts = payouts.filter((p) => p.status === "pending");
  const totalReferred = referrals.length;
  const totalEarnings = Number(referrer.referralEarnings);
  const pendingAmount = pendingPayouts.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href="/admin/networks"
        style={{
          color: "var(--accent, #534AB7)",
          textDecoration: "none",
          marginBottom: "24px",
          display: "inline-block",
          fontSize: "14px",
          fontWeight: 500,
        }}
      >
        ← Back to Networks
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-3xl font-bold mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          {referrer.creatorProfile?.displayName || referrer.email}
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>{referrer.email}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div
          className="p-6 rounded-xl"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="text-sm font-medium mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Total Referred
          </p>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {totalReferred}
          </p>
        </div>

        <div
          className="p-6 rounded-xl"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="text-sm font-medium mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Total Earnings
          </p>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            ${totalEarnings.toFixed(2)}
          </p>
        </div>

        <div
          className="p-6 rounded-xl"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="text-sm font-medium mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Pending Payouts
          </p>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            ${pendingAmount.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="mb-8">
        <h2
          className="text-xl font-bold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Referrals ({totalReferred})
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th
                  className="px-6 py-3 text-left text-xs font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Name
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Email
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Joined Date
                </th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((ref) => (
                <tr
                  key={ref.id}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td
                    className="px-6 py-3 text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {ref.creatorProfile?.displayName || "-"}
                  </td>
                  <td
                    className="px-6 py-3 text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {ref.email}
                  </td>
                  <td
                    className="px-6 py-3 text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {new Date(ref.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {referrals.length === 0 && (
            <div
              className="px-6 py-8 text-center"
              style={{ color: "var(--text-secondary)" }}
            >
              <p>No referrals yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Payouts Table */}
      <div>
        <h2
          className="text-xl font-bold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Payout History ({payouts.length})
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th
                  className="px-6 py-3 text-left text-xs font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Amount
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Status
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr
                  key={payout.id}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td
                    className="px-6 py-3 text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    ${Number(payout.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <span
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        background:
                          payout.status === "completed"
                            ? "var(--success-bg)"
                            : payout.status === "pending"
                              ? "var(--warning-bg)"
                              : "var(--bg-card)",
                        color:
                          payout.status === "completed"
                            ? "var(--success-text)"
                            : payout.status === "pending"
                              ? "var(--warning-text)"
                              : "var(--text-secondary)",
                      }}
                    >
                      {payout.status}
                    </span>
                  </td>
                  <td
                    className="px-6 py-3 text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {new Date(payout.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {payouts.length === 0 && (
            <div
              className="px-6 py-8 text-center"
              style={{ color: "var(--text-secondary)" }}
            >
              <p>No payouts yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

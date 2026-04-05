import Link from "next/link";
import { checkRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function NetworksPage() {
  const isAdmin = await checkRole("admin");
  if (!isAdmin) {
    redirect("/");
  }

  // Get all users who have a referral code (potential referrers)
  const referrers = await prisma.user.findMany({
    where: { referralCode: { not: null } },
    select: {
      id: true,
      email: true,
      referralCode: true,
      referralEarnings: true,
      creatorProfile: { select: { displayName: true } },
      _count: { select: { referralPayouts: true } },
    },
    orderBy: { referralEarnings: "desc" },
  });

  // Get referral counts per referrer
  const referralCounts = await prisma.user.groupBy({
    by: ["referredBy"],
    where: { referredBy: { not: null } },
    _count: { id: true },
  });

  const referralCountMap = new Map(
    referralCounts.map((rc) => [rc.referredBy!, rc._count.id])
  );

  // Calculate summary stats
  const totalReferrers = referrers.length;
  const totalReferrals = referralCounts.reduce((sum, rc) => sum + rc._count.id, 0);
  const totalRevenueShared = referrers.reduce(
    (sum, ref) => sum + Number(ref.referralEarnings),
    0
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          Networks
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Track referrers, referrals, and revenue share
        </p>
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
            Total Referrers
          </p>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {totalReferrers}
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
            Total Referrals
          </p>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {totalReferrals}
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
            Total Revenue Shared
          </p>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            ${totalRevenueShared.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Referrers Table */}
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
                Referral Code
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                Referrals
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                Total Earnings
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                Payouts
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {referrers.map((ref) => (
              <tr
                key={ref.id}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <td
                  className="px-6 py-3 text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {ref.creatorProfile?.displayName ?? "-"}
                </td>
                <td
                  className="px-6 py-3 text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {ref.email}
                </td>
                <td className="px-6 py-3 text-sm">
                  <code
                    style={{
                      color: "var(--accent, #534AB7)",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      fontWeight: 500,
                    }}
                  >
                    {ref.referralCode}
                  </code>
                </td>
                <td
                  className="px-6 py-3 text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {referralCountMap.get(ref.id) ?? 0}
                </td>
                <td
                  className="px-6 py-3 text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  ${Number(ref.referralEarnings).toFixed(2)}
                </td>
                <td
                  className="px-6 py-3 text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {ref._count.referralPayouts}
                </td>
                <td className="px-6 py-3 text-sm">
                  <Link
                    href={`/admin/networks/${ref.id}`}
                    style={{
                      color: "var(--accent, #534AB7)",
                      textDecoration: "none",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {referrers.length === 0 && (
          <div
            className="px-6 py-8 text-center"
            style={{ color: "var(--text-secondary)" }}
          >
            <p>No referrers with active referral codes yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

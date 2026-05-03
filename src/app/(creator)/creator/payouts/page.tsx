import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { PaymentsTabs } from "./_components/payments-tabs";

export const metadata = {
  title: "Payments",
};

export default async function PaymentsPage() {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      walletAddress: true,
      tronsAddress: true,
      stripeAccountId: true,
    },
  });
  if (!profile) throw new Error("Creator profile not found");

  const [payouts, submissions] = await Promise.all([
    prisma.payout.findMany({
      where: { creatorProfileId: profile.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.campaignSubmission.findMany({
      where: { creatorId: user.id, status: "APPROVED" },
      include: { campaign: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalEarned = submissions.reduce((sum, sub) => sum + Number(sub.earnedAmount), 0);
  const totalPaid = payouts
    .filter((p) => p.status === "confirmed" || p.status === "sent")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingPayout = payouts
    .filter((p) => p.status === "pending" || p.status === "processing")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = totalEarned - totalPaid;
  const hasPaymentMethod = Boolean(
    profile.walletAddress || profile.tronsAddress || profile.stripeAccountId,
  );

  // Group approved submissions by campaign for the Overview tab.
  const byCampaign: Record<
    string,
    { campaignId: string; campaignName: string; totalViews: number; totalEarned: number; count: number }
  > = {};
  submissions.forEach((sub) => {
    if (!byCampaign[sub.campaignId]) {
      byCampaign[sub.campaignId] = {
        campaignId: sub.campaignId,
        campaignName: sub.campaign.name,
        totalViews: 0,
        totalEarned: 0,
        count: 0,
      };
    }
    byCampaign[sub.campaignId].totalViews += sub.claimedViews;
    byCampaign[sub.campaignId].totalEarned += Number(sub.earnedAmount);
    byCampaign[sub.campaignId].count += 1;
  });
  const earningsByCampaign = Object.values(byCampaign).sort(
    (a, b) => b.totalEarned - a.totalEarned,
  );

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          Payments
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Your earnings, withdrawals, and payout history in one place.
        </p>
      </header>

      {balance > 0 && !hasPaymentMethod && (
        <AlertBanner
          tone="warning"
          title="Add a payment method before your next withdrawal"
          description={`You have $${balance.toFixed(2)} available but no destination set. Open the Withdraw tab to send it.`}
          cta={{ label: "Withdraw", href: "?tab=withdraw" }}
        />
      )}

      <PaymentsTabs
        overviewSlot={
          <OverviewTab
            totalEarned={totalEarned}
            totalPaid={totalPaid}
            balance={balance}
            pendingPayout={pendingPayout}
            earningsByCampaign={earningsByCampaign}
          />
        }
        historySlot={<HistoryTab payouts={payouts} />}
      />
    </div>
  );
}

interface OverviewTabProps {
  totalEarned: number;
  totalPaid: number;
  balance: number;
  pendingPayout: number;
  earningsByCampaign: Array<{
    campaignId: string;
    campaignName: string;
    totalViews: number;
    totalEarned: number;
    count: number;
  }>;
}

function OverviewTab({
  totalEarned,
  totalPaid,
  balance,
  pendingPayout,
  earningsByCampaign,
}: OverviewTabProps) {
  const cards = [
    { label: "Available balance", value: `$${balance.toFixed(2)}`, color: balance > 0 ? "var(--warning-text)" : "var(--text-secondary)" },
    { label: "Pending", value: `$${pendingPayout.toFixed(2)}`, color: "var(--accent-foreground)" },
    { label: "Total paid", value: `$${totalPaid.toFixed(2)}`, color: "var(--success-text)" },
    { label: "Total earned", value: `$${totalEarned.toFixed(2)}`, color: "var(--text-primary)" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border p-5"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              {c.label}
            </p>
            <p className="mt-1.5 text-2xl font-bold" style={{ color: c.color }}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <section
        className="rounded-xl border overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div
          className="px-5 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Earnings by campaign
          </h2>
        </div>
        {earningsByCampaign.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No approved earnings yet"
              description="Once your clips are approved, your campaign earnings will appear here."
              primaryCta={{ label: "Browse campaigns", href: "/creator/campaigns" }}
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">Campaign</th>
                <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">Submissions</th>
                <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">Total views</th>
                <th className="text-right text-[11px] uppercase tracking-wide px-5 py-2 font-medium">Earned</th>
              </tr>
            </thead>
            <tbody>
              {earningsByCampaign.map((row) => (
                <tr key={row.campaignId} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-5 py-3" style={{ color: "var(--text-primary)" }}>{row.campaignName}</td>
                  <td className="px-5 py-3" style={{ color: "var(--text-secondary)" }}>{row.count}</td>
                  <td className="px-5 py-3" style={{ color: "var(--text-secondary)" }}>{row.totalViews.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-semibold" style={{ color: "var(--success-text)" }}>
                    ${row.totalEarned.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function HistoryTab({
  payouts,
}: {
  payouts: Array<{
    id: string;
    amount: { toString(): string } | number;
    type: string;
    status: string;
    paymentMethod: string | null;
    createdAt: Date;
  }>;
}) {
  if (payouts.length === 0) {
    return (
      <EmptyState
        title="No payouts yet"
        description="Your balance is paid out weekly. Once we send a payout, it'll show up here."
      />
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
            <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">Date</th>
            <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">Amount</th>
            <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">Type</th>
            <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">Status</th>
            <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">Method</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((p) => (
            <tr key={p.id} className="border-t" style={{ borderColor: "var(--border)" }}>
              <td className="px-5 py-3" style={{ color: "var(--text-secondary)" }}>
                {new Date(p.createdAt).toLocaleDateString()}
              </td>
              <td className="px-5 py-3" style={{ color: "var(--text-primary)" }}>
                ${Number(p.amount).toFixed(2)}
              </td>
              <td className="px-5 py-3" style={{ color: "var(--text-secondary)" }}>
                {p.type.charAt(0).toUpperCase() + p.type.slice(1)}
              </td>
              <td className="px-5 py-3">
                <Badge variant={payoutBadge(p.status)}>{p.status}</Badge>
              </td>
              <td className="px-5 py-3" style={{ color: "var(--text-secondary)" }}>
                {p.paymentMethod || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function payoutBadge(status: string) {
  if (status === "confirmed" || status === "sent") return "paid" as const;
  if (status === "processing") return "pending" as const;
  if (status === "pending") return "pending" as const;
  if (status === "failed") return "failed" as const;
  return "neutral" as const;
}

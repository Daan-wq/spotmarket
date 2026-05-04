import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PaymentsTabs } from "./_components/payments-tabs";
import {
  CreatorPageHeader,
  CreatorSectionHeader,
  SoftStat,
} from "../_components/creator-journey";

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
    <div className="w-full space-y-8 px-6 py-8">
      <CreatorPageHeader
        eyebrow="Payments"
        title="Payments"
        description="Follow earnings from approved clips into withdrawal requests and payout history."
      />

      <PaymentsTabs
        totalEarned={totalEarned}
        totalPaid={totalPaid}
        balance={balance}
        pendingPayout={pendingPayout}
        hasPaymentMethod={hasPaymentMethod}
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
    { label: "Available balance", value: `$${balance.toFixed(2)}`, detail: "Ready when withdrawal unlocks" },
    { label: "Pending", value: `$${pendingPayout.toFixed(2)}`, detail: "Requests in progress" },
    { label: "Total paid", value: `$${totalPaid.toFixed(2)}`, detail: "Confirmed or sent" },
    { label: "Total earned", value: `$${totalEarned.toFixed(2)}`, detail: "Approved submissions" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <SoftStat key={card.label} label={card.label} value={card.value} detail={card.detail} />
        ))}
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <CreatorSectionHeader
          title="Earnings by campaign"
          description="Approved clip earnings grouped by campaign."
        />
        {earningsByCampaign.length === 0 ? (
          <EmptyState
            title="No approved earnings yet"
            description="Once your clips are approved, your campaign earnings will appear here."
            primaryCta={{ label: "Browse campaigns", href: "/creator/campaigns" }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Campaign</th>
                  <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Submissions</th>
                  <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Total views</th>
                  <th className="px-5 py-2 text-right text-[11px] font-medium uppercase tracking-wide">Earned</th>
                </tr>
              </thead>
              <tbody>
                {earningsByCampaign.map((row) => (
                  <tr key={row.campaignId} className="border-b border-neutral-100 last:border-0">
                    <td className="px-5 py-3 font-medium text-neutral-950">{row.campaignName}</td>
                    <td className="px-5 py-3 text-neutral-600">{row.count}</td>
                    <td className="px-5 py-3 text-neutral-600">{row.totalViews.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-semibold text-neutral-950">
                      ${row.totalEarned.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        description="Your balance is paid out weekly. Once we send a payout, it will show up here."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
            <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Date</th>
            <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Amount</th>
            <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Type</th>
            <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Status</th>
            <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Method</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((p) => (
            <tr key={p.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-5 py-3 text-neutral-600">
                {new Date(p.createdAt).toLocaleDateString()}
              </td>
              <td className="px-5 py-3 font-medium text-neutral-950">
                ${Number(p.amount).toFixed(2)}
              </td>
              <td className="px-5 py-3 text-neutral-600">
                {p.type.charAt(0).toUpperCase() + p.type.slice(1)}
              </td>
              <td className="px-5 py-3">
                <Badge variant={payoutBadge(p.status)}>{p.status}</Badge>
              </td>
              <td className="px-5 py-3 text-neutral-600">
                {p.paymentMethod || "-"}
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

import { prisma } from "@/lib/prisma";
import { PayoutActionsRow } from "./payout-actions-row";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";
import { EmptyState } from "@/components/admin/empty-state";
import { Payout, PayoutStatus, PayoutType } from "@prisma/client";

interface PayoutWithApplication extends Payout {
  application: {
    campaign: { name: string };
    creatorProfile: { displayName: string; walletAddress: string | null } | null;
  } | null;
}

interface PayoutRowComponent {
  id: string;
  amount: string | number;
  currency: string;
  walletAddress: string;
  type: PayoutType;
  status: PayoutStatus;
  txHash: string | null;
  verifiedViews: number | null;
  createdAt: string;
  application: {
    campaign: { name: string };
    creatorProfile: { displayName: string; walletAddress: string | null };
  };
}

function transformPayout(payout: PayoutWithApplication): PayoutRowComponent | null {
  if (!payout.application) return null;
  return {
    id: payout.id,
    amount: Number(payout.amount),
    currency: payout.currency,
    walletAddress: payout.walletAddress || "",
    type: payout.type,
    status: payout.status,
    txHash: payout.txHash,
    verifiedViews: payout.verifiedViews,
    createdAt: payout.createdAt.toISOString(),
    application: payout.application as PayoutRowComponent['application'],
  };
}

interface SectionProps {
  title: string;
  items: PayoutWithApplication[];
  readonly?: boolean;
}

function Section({ title, items, readonly = false }: SectionProps) {
  return (
    <div className="rounded-lg overflow-hidden mb-4 border border-gray-200">
      <div className="px-5 py-3 border-b border-gray-100 bg-white">
        <p className="text-[13px] font-medium text-gray-900">{title}</p>
      </div>
      <div className="bg-white">
        {items
          .map((p) => ({ payout: transformPayout(p), id: p.id }))
          .filter((item) => item.payout !== null)
          .map(({ payout, id }) => (
            <PayoutActionsRow key={id} payout={payout!} readonly={readonly} />
          ))}
      </div>
    </div>
  );
}

export default async function AdminPayoutsPage() {
  const payouts = await prisma.payout.findMany({
    include: {
      application: {
        include: {
          campaign: { select: { name: true } },
          creatorProfile: { select: { displayName: true, walletAddress: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = payouts.filter((p) => p.status === "pending");
  const processing = payouts.filter((p) => p.status === "processing" || p.status === "sent");
  const done = payouts.filter((p) => p.status === "confirmed" || p.status === "failed");

  const now = new Date();
  const paidThisMonth = payouts
    .filter((p) => {
      const d = new Date(p.createdAt);
      return (
        p.status === "confirmed" &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  const totalPaid = payouts
    .filter((p) => p.status === "confirmed")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="Payouts" subtitle="Review and process creator payouts" />
      <StatCards
        stats={[
          { label: "Pending review", value: pending.length },
          { label: "Processing", value: processing.length },
          { label: "Paid this month", value: `$${paidThisMonth.toFixed(2)}` },
          { label: "Total paid", value: `$${totalPaid.toFixed(2)}` },
        ]}
      />

      {payouts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200">
          <EmptyState
            icon={
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
              </svg>
            }
            title="No payouts yet"
            description="Payouts are generated automatically each week based on verified views. They'll appear here for your review."
          />
        </div>
      ) : (
        <>
          {pending.length > 0 && <Section title={`Pending (${pending.length})`} items={pending} />}
          {processing.length > 0 && <Section title={`In Progress (${processing.length})`} items={processing} />}
          {done.length > 0 && <Section title={`Completed (${done.length})`} items={done} readonly />}
        </>
      )}
    </div>
  );
}

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatorSectionHeader } from "../../_components/creator-journey";
import { getCreatorPayoutTotals } from "../_data";

export async function PayoutSummary({ userId }: { userId: string }) {
  const { totalEarnings, totalPaid, availableBalance } =
    await getCreatorPayoutTotals(userId);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
      <CreatorSectionHeader
        title="Payout summary"
        description="Estimated earnings become final after review and payout processing."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MiniPayout label="Estimated" value={`$${totalEarnings.toFixed(2)}`} />
        <MiniPayout
          label="Pending/final"
          value={`$${availableBalance.toFixed(2)}`}
        />
        <MiniPayout label="Paid" value={`$${totalPaid.toFixed(2)}`} />
      </div>
      <Link
        href="/creator/payouts"
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] hover:bg-neutral-800"
      >
        Open payments
      </Link>
    </div>
  );
}

export function PayoutSummarySkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
      <Skeleton className="mb-5 h-4 w-40" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-200 bg-neutral-50 p-3"
          >
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-4 h-11 w-full rounded-xl" />
    </div>
  );
}

function MiniPayout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

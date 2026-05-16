import { getCreatorHeader } from "@/lib/auth";
import { getCreatorPaymentSummary } from "@/lib/creator-payment-summary";

interface BalanceWidgetProps {
  supabaseId: string;
}

export async function BalanceWidget({ supabaseId }: BalanceWidgetProps) {
  const header = await getCreatorHeader(supabaseId);
  if (!header?.creatorProfile) {
    return (
      <div className="text-xs">
        <div style={{ color: "var(--text-muted)" }}>Total Earnings</div>
        <div className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
          $0.00
        </div>
      </div>
    );
  }

  const { totalEarned } = await getCreatorPaymentSummary(
    header.id,
    header.creatorProfile.id,
  );

  return (
    <div className="text-xs">
      <div style={{ color: "var(--text-muted)" }}>Total Earnings</div>
      <div className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
        ${totalEarned.toFixed(2)}
      </div>
    </div>
  );
}

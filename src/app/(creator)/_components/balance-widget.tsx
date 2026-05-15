import { getCreatorHeader } from "@/lib/auth";
import { getCreatorTotalEarnings } from "@/lib/earnings";

interface BalanceWidgetProps {
  supabaseId: string;
}

export async function BalanceWidget({ supabaseId }: BalanceWidgetProps) {
  const header = await getCreatorHeader(supabaseId);
  if (!header) {
    return (
      <div className="text-xs">
        <div style={{ color: "var(--text-muted)" }}>Total Earnings</div>
        <div className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
          $0.00
        </div>
      </div>
    );
  }

  const { total } = await getCreatorTotalEarnings(header.id);

  return (
    <div className="text-xs">
      <div style={{ color: "var(--text-muted)" }}>Total Earnings</div>
      <div className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
        ${total.toFixed(2)}
      </div>
    </div>
  );
}

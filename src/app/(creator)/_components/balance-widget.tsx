import { getCreatorTotalEarnings } from "@/lib/earnings";

interface BalanceWidgetProps {
  userId: string;
}

export async function BalanceWidget({ userId }: BalanceWidgetProps) {
  const { total } = await getCreatorTotalEarnings(userId);

  return (
    <div className="text-xs">
      <div style={{ color: "var(--text-muted)" }}>Total Earnings</div>
      <div className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
        ${total.toFixed(2)}
      </div>
    </div>
  );
}

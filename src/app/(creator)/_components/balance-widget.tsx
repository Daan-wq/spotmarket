import { prisma } from "@/lib/prisma";

interface BalanceWidgetProps {
  creatorProfileId: string;
}

export async function BalanceWidget({ creatorProfileId }: BalanceWidgetProps) {
  const [available, pending] = await Promise.all([
    prisma.payout.aggregate({
      where: { creatorProfileId, status: "confirmed" },
      _sum: { amount: true },
    }),
    prisma.payout.aggregate({
      where: { creatorProfileId, status: "pending" },
      _sum: { amount: true },
    }),
  ]);

  const availableBalance = Number(available._sum.amount ?? 0);
  const pendingBalance = Number(pending._sum.amount ?? 0);

  return (
    <div className="flex justify-between text-xs">
      <div>
        <div style={{ color: "var(--text-muted)" }}>Available</div>
        <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
          ${availableBalance.toFixed(0)}
        </div>
      </div>
      <div className="text-right">
        <div style={{ color: "var(--text-muted)" }}>Pending</div>
        <div className="font-semibold" style={{ color: "var(--primary)" }}>
          ${pendingBalance.toFixed(0)}
        </div>
      </div>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { PayoutActionsRow } from "./payout-actions-row";

export default async function AdminPayoutsPage() {
  const payouts = await prisma.payout.findMany({
    include: {
      application: {
        include: {
          campaign: { select: { name: true } },
          creatorProfile: {
            select: { displayName: true, walletAddress: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = payouts.filter((p) => p.status === "pending");
  const processing = payouts.filter((p) => p.status === "processing" || p.status === "sent");
  const done = payouts.filter((p) => p.status === "confirmed" || p.status === "failed");

  const totalPending = pending.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  const Section = ({ title, items, readonly = false }: { title: string; items: typeof payouts; readonly?: boolean }) => (
    <div className="rounded-xl overflow-hidden mb-4" style={{ border: "1px solid #e2e8f0" }}>
      <div className="px-5 py-3" style={{ borderBottom: "1px solid #f1f5f9", background: "#ffffff" }}>
        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{title}</p>
      </div>
      <div style={{ background: "#ffffff" }}>
        {items.map((p) => (
          <PayoutActionsRow key={p.id} payout={p as any} readonly={readonly} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>Payouts</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Manage creator payouts.</p>
        </div>
        <div className="text-right">
          <p className="text-xs mb-0.5" style={{ color: "#94a3b8" }}>Pending total</p>
          <p className="text-xl font-semibold" style={{ color: "#0f172a" }}>${totalPending.toFixed(2)}</p>
        </div>
      </div>

      {payouts.length === 0 ? (
        <div className="rounded-xl px-6 py-16 text-center" style={{ border: "1px solid #e2e8f0", background: "#ffffff" }}>
          <p className="text-sm" style={{ color: "#94a3b8" }}>No payouts yet.</p>
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

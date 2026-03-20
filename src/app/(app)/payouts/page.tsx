import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const statusStyle: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: "#f0fdf4", text: "#15803d" },
  sent:      { bg: "#eff6ff", text: "#1d4ed8" },
  pending:   { bg: "#fffbeb", text: "#b45309" },
  failed:    { bg: "#fef2f2", text: "#b91c1c" },
};

export default async function PayoutsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: {
        include: {
          applications: {
            include: {
              payouts: { orderBy: { createdAt: "desc" } },
              campaign: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const allPayouts = user?.creatorProfile?.applications.flatMap((app) =>
    app.payouts.map((p) => ({ ...p, campaignName: app.campaign.name }))
  ) ?? [];

  allPayouts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>Payouts</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>History of all payments sent to your wallet.</p>
      </div>

      {allPayouts.length === 0 ? (
        <div className="rounded-xl px-6 py-16 text-center" style={{ border: "1px solid #e2e8f0", background: "#ffffff" }}>
          <p className="text-sm" style={{ color: "#94a3b8" }}>No payouts yet.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
          {/* Header */}
          <div
            className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2.5"
            style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}
          >
            {["Campaign", "Type", "Date", "Amount"].map((h) => (
              <p key={h} className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>
                {h}
              </p>
            ))}
          </div>

          {/* Rows */}
          <div style={{ background: "#ffffff" }}>
            {allPayouts.map((payout, i) => {
              const colors = statusStyle[payout.status] ?? { bg: "#f1f5f9", text: "#475569" };
              return (
                <div
                  key={payout.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-4"
                  style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#0f172a" }}>{payout.campaignName}</p>
                    {payout.txHash && (
                      <p className="text-xs font-mono mt-0.5 truncate" style={{ color: "#94a3b8" }}>
                        {payout.txHash.slice(0, 18)}…
                      </p>
                    )}
                  </div>

                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{ background: "#eef2ff", color: "#3730a3" }}
                  >
                    {payout.type}
                  </span>

                  <p className="text-sm whitespace-nowrap" style={{ color: "#64748b" }}>
                    {new Date(payout.createdAt).toLocaleDateString()}
                  </p>

                  <div className="flex items-center gap-2 justify-end">
                    <p className="text-sm font-semibold whitespace-nowrap" style={{ color: "#0f172a" }}>
                      ${parseFloat(payout.amount.toString()).toFixed(2)}
                    </p>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {payout.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

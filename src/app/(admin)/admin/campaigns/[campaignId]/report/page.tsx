import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GenerateReportButton } from "./generate-report-button";

export default async function AdminCampaignReportPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      report: true,
      applications: {
        where: { status: { in: ["active", "completed"] } },
        include: {
          creatorProfile: { select: { displayName: true, walletAddress: true } },
          payouts: { orderBy: { type: "asc" } },
          posts: {
            where: { isFraudSuspect: false, isApproved: true },
            include: { snapshots: { orderBy: { capturedAt: "asc" }, take: 1, select: { viewsCount: true } } },
          },
        },
      },
    },
  });

  if (!campaign) notFound();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/admin/campaigns/${campaignId}`} className="text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
          ← {campaign.name}
        </Link>
      </div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Campaign Report</h1>
        <GenerateReportButton campaignId={campaignId} />
      </div>

      {campaign.report ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Verified Views", value: campaign.report.totalViews.toLocaleString() },
              { label: "Creator Payouts", value: `$${parseFloat(campaign.report.totalPayout.toString()).toFixed(2)}` },
              { label: "Admin Revenue", value: `$${parseFloat(campaign.report.adminRevenue.toString()).toFixed(2)}` },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border p-5" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{k.label}</p>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Per-creator table */}
          <div className="rounded-xl border mb-6" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderBottomColor: "var(--border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Creator Breakdown</h2>
              <a
                href={`/api/campaigns/${campaignId}/report/csv`}
                className="text-xs hover:underline"
                style={{ color: "var(--accent)" }}
              >
                Export CSV
              </a>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottomWidth: "1px", borderBottomColor: "var(--border)" }}>
                  <th className="text-left px-6 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Creator</th>
                  <th className="text-right px-6 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Verified Views</th>
                  <th className="text-right px-6 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Earnings</th>
                  <th className="text-right px-6 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Payout Status</th>
                </tr>
              </thead>
              <tbody>
                {campaign.applications.filter((app) => app.creatorProfile !== null).map((app) => {
                  const reportData = campaign.report?.dataJson as {
                    creators: { creatorProfileId: string; verifiedViews: number; earnings: number }[];
                  } | null;
                  const creatorData = reportData?.creators.find(
                    (c) => c.creatorProfileId === app.creatorProfileId
                  );
                  const finalPayout = app.payouts.find((p) => p.type === "final");
                  const upfrontPayout = app.payouts.find((p) => p.type === "upfront");

                  const statusStyles = finalPayout
                    ? finalPayout.status === "confirmed"
                      ? { background: "var(--success-bg)", color: "var(--success-text)" }
                      : finalPayout.status === "sent"
                      ? { background: "var(--accent-bg)", color: "var(--accent-foreground)" }
                      : { background: "var(--warning-bg)", color: "var(--warning-text)" }
                    : undefined;

                  return (
                    <tr key={app.id} style={{ borderBottomWidth: "1px", borderBottomColor: "var(--border)" }}>
                      <td className="px-6 py-3">
                        <p className="font-medium" style={{ color: "var(--text-primary)" }}>{app.creatorProfile!.displayName}</p>
                        {app.creatorProfile!.walletAddress && (
                          <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                            {app.creatorProfile!.walletAddress.substring(0, 10)}…
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right" style={{ color: "var(--text-secondary)" }}>
                        {(creatorData?.verifiedViews ?? 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right" style={{ color: "var(--text-secondary)" }}>
                        ${(creatorData?.earnings ?? 0).toFixed(2)}
                        {upfrontPayout && (
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            Upfront: ${parseFloat(upfrontPayout.amount.toString()).toFixed(2)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {finalPayout ? (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={statusStyles}
                          >
                            {finalPayout.status}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>No payout</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="rounded-xl border p-12 text-center" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>No report generated yet.</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Reports aggregate verified views from all approved posts and create final payout records.
          </p>
        </div>
      )}
    </div>
  );
}

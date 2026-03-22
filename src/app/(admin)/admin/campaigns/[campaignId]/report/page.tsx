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
        <Link href={`/admin/campaigns/${campaignId}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← {campaign.name}
        </Link>
      </div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Campaign Report</h1>
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
              <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                <p className="text-2xl font-bold text-gray-900">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Per-creator table */}
          <div className="bg-white rounded-xl border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Creator Breakdown</h2>
              <a
                href={`/api/campaigns/${campaignId}/report/csv`}
                className="text-xs text-indigo-600 hover:underline"
              >
                Export CSV
              </a>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Creator</th>
                  <th className="text-right px-6 py-3 text-xs text-gray-500 font-medium">Verified Views</th>
                  <th className="text-right px-6 py-3 text-xs text-gray-500 font-medium">Earnings</th>
                  <th className="text-right px-6 py-3 text-xs text-gray-500 font-medium">Payout Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaign.applications.filter((app) => app.creatorProfile !== null).map((app) => {
                  const reportData = campaign.report?.dataJson as {
                    creators: { creatorProfileId: string; verifiedViews: number; earnings: number }[];
                  } | null;
                  const creatorData = reportData?.creators.find(
                    (c) => c.creatorProfileId === app.creatorProfileId
                  );
                  const finalPayout = app.payouts.find((p) => p.type === "final");
                  const upfrontPayout = app.payouts.find((p) => p.type === "upfront");

                  return (
                    <tr key={app.id}>
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-900">{app.creatorProfile!.displayName}</p>
                        {app.creatorProfile!.walletAddress && (
                          <p className="text-xs text-gray-400 font-mono">
                            {app.creatorProfile!.walletAddress.substring(0, 10)}…
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-700">
                        {(creatorData?.verifiedViews ?? 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-700">
                        ${(creatorData?.earnings ?? 0).toFixed(2)}
                        {upfrontPayout && (
                          <p className="text-xs text-gray-400">
                            Upfront: ${parseFloat(upfrontPayout.amount.toString()).toFixed(2)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {finalPayout ? (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              finalPayout.status === "confirmed"
                                ? "bg-green-100 text-green-700"
                                : finalPayout.status === "sent"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {finalPayout.status}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No payout</span>
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
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm mb-4">No report generated yet.</p>
          <p className="text-xs text-gray-400">
            Reports aggregate verified views from all approved posts and create final payout records.
          </p>
        </div>
      )}
    </div>
  );
}

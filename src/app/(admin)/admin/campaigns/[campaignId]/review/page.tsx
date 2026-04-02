import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ReviewActions } from "./review-actions";

export default async function CampaignReviewPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      createdBy: {
        include: {
          creatorProfile: { select: { displayName: true, tronsAddress: true } },
        },
      },
    },
  });

  if (!campaign || campaign.status !== "pending_review") {
    redirect("/admin/campaigns");
  }

  const owner = campaign.createdBy;
  const ownerName = owner?.creatorProfile?.displayName ?? owner?.email ?? "Unknown";
  const ownerWallet = owner?.creatorProfile?.tronsAddress ?? campaign.ownerWalletAddress;

  const fieldRow = (label: string, value: string | null | undefined) =>
    value ? (
      <div className="grid grid-cols-[180px_1fr] gap-2 py-2 border-b border-gray-100 last:border-0">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-sm text-gray-800 break-words">{value}</span>
      </div>
    ) : null;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <a href="/admin/campaigns" className="text-sm text-gray-400 hover:text-gray-600">← Campaigns</a>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-blue-700">Review pending campaign</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">{campaign.name}</h1>
      <p className="text-sm text-gray-500 mb-6">Submitted by <strong>{ownerName}</strong> · {campaign.createdAt.toLocaleDateString()}</p>

      {/* Deposit verification */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-sm font-semibold text-blue-800 mb-2">Deposit verification</p>
        <div className="space-y-1 text-sm">
          <div className="flex gap-2">
            <span className="text-blue-600 w-24 shrink-0">Amount:</span>
            <span className="font-semibold text-blue-900">${Number(campaign.totalBudget).toLocaleString()} USDT</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-blue-600 w-24 shrink-0">TX hash:</span>
            {campaign.depositTxHash ? (
              <a
                href={`https://tronscan.org/#/transaction/${campaign.depositTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs break-all text-blue-700 underline"
              >
                {campaign.depositTxHash} ↗
              </a>
            ) : (
              <span className="text-red-600">Not provided</span>
            )}
          </div>
          {ownerWallet && (
            <div className="flex gap-2">
              <span className="text-blue-600 w-24 shrink-0">Refund to:</span>
              <span className="font-mono text-xs text-blue-700">{ownerWallet}</span>
            </div>
          )}
        </div>
      </div>

      {/* Campaign details */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <p className="text-sm font-semibold text-gray-800 mb-3">Campaign Details</p>
        {fieldRow("Platform", campaign.platform)}
        {fieldRow("Content type", campaign.contentType)}
        {fieldRow("Description", campaign.description)}
        {fieldRow("Guidelines", campaign.contentGuidelines)}
        {fieldRow("Requirements", campaign.requirements)}
        {fieldRow("Other notes", campaign.otherNotes)}
        {fieldRow("Target country", campaign.targetCountry ?? (campaign.targetGeo.join(", ") || null))}
        {fieldRow("Min country %", campaign.targetCountryPercent?.toString())}
        {fieldRow("Min age 18+ %", campaign.targetMinAge18Percent?.toString())}
        {fieldRow("Min male %", campaign.targetMalePercent?.toString())}
        {fieldRow("Min engagement", campaign.minEngagementRate ? `${Number(campaign.minEngagementRate)}%` : null)}
        {fieldRow("Budget (USDT)", `$${Number(campaign.totalBudget).toLocaleString()}`)}
        {fieldRow("Goal views", campaign.goalViews ? Number(campaign.goalViews).toLocaleString() : "Not specified")}
        {fieldRow("Deadline", campaign.deadline.toLocaleString())}
        {fieldRow("Referral link", campaign.referralLink)}
      </div>

      {/* Review actions */}
      <ReviewActions
        campaignId={campaign.id}
        totalBudget={Number(campaign.totalBudget)}
        goalViews={campaign.goalViews ? Number(campaign.goalViews) : null}
      />
    </div>
  );
}

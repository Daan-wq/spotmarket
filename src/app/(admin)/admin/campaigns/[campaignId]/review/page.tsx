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
      <div className="grid grid-cols-[180px_1fr] gap-2 py-2 border-b last:border-0" style={{ borderBottomColor: "var(--border)" }}>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
        <span className="text-sm break-words" style={{ color: "var(--text-secondary)" }}>{value}</span>
      </div>
    ) : null;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <a href="/admin/campaigns" className="text-sm hover:underline" style={{ color: "var(--text-muted)" }}>← Campaigns</a>
        <span style={{ color: "var(--border)" }}>/</span>
        <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>Review pending campaign</span>
      </div>

      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{campaign.name}</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Submitted by <strong>{ownerName}</strong> · {campaign.createdAt.toLocaleDateString()}</p>

      {/* Deposit verification */}
      <div className="rounded-xl border p-4 mb-6" style={{ background: "var(--accent-bg)", borderColor: "var(--accent-muted)" }}>
        <p className="text-sm font-semibold mb-2" style={{ color: "var(--accent-foreground)" }}>Deposit verification</p>
        <div className="space-y-1 text-sm">
          <div className="flex gap-2">
            <span className="w-24 shrink-0" style={{ color: "var(--accent)" }}>Amount:</span>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>${Number(campaign.totalBudget).toLocaleString()} USDT</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="w-24 shrink-0" style={{ color: "var(--accent)" }}>TX hash:</span>
            {campaign.depositTxHash ? (
              <a
                href={`https://tronscan.org/#/transaction/${campaign.depositTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs break-all underline"
                style={{ color: "var(--accent)" }}
              >
                {campaign.depositTxHash} ↗
              </a>
            ) : (
              <span style={{ color: "var(--error)" }}>Not provided</span>
            )}
          </div>
          {ownerWallet && (
            <div className="flex gap-2">
              <span className="w-24 shrink-0" style={{ color: "var(--accent)" }}>Refund to:</span>
              <span className="font-mono text-xs" style={{ color: "var(--accent)" }}>{ownerWallet}</span>
            </div>
          )}
        </div>
      </div>

      {/* Campaign details */}
      <div className="border rounded-xl p-5 mb-6" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Campaign Details</p>
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

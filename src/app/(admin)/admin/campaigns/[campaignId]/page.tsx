import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ApplicationReviewTable } from "./application-review-table";
import { CampaignStatusToggle } from "./campaign-status-toggle";

export default async function AdminCampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      businessProfile: { select: { companyName: true } },
      applications: {
        include: {
          creatorProfile: {
            include: {
              socialAccounts: {
                where: { isActive: true },
                select: {
                  platform: true,
                  platformUsername: true,
                  followerCount: true,
                  engagementRate: true,
                  audienceGeo: true,
                  lastSyncedAt: true,
                },
              },
            },
          },
        },
        orderBy: { appliedAt: "desc" },
      },
      report: true,
    },
  });

  if (!campaign) notFound();

  const pending = campaign.applications.filter((a) => a.status === "pending");
  const approved = campaign.applications.filter((a) =>
    ["approved", "active", "completed"].includes(a.status)
  );
  const rejected = campaign.applications.filter((a) => a.status === "rejected");

  const details = [
    { label: "Target Geo",      value: campaign.targetGeo.join(", ") },
    { label: "Creator CPV",     value: `$${campaign.creatorCpv.toString()}/view` },
    { label: "Total Budget",    value: `$${campaign.totalBudget.toString()}` },
    { label: "Deadline",        value: new Date(campaign.deadline).toLocaleDateString() },
    { label: "Min Followers",   value: campaign.minFollowers.toLocaleString() },
    { label: "Min Engagement",  value: `${campaign.minEngagementRate.toString()}%` },
    { label: "Admin Margin",    value: `$${campaign.adminMargin.toString()}/view` },
    { label: "Referral Link",   value: campaign.referralLink.substring(0, 30) + "…" },
  ];

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link href="/admin/campaigns" className="text-sm hover:underline" style={{ color: "#94a3b8" }}>
            ← Campaigns
          </Link>
          <h1 className="text-2xl font-semibold mt-2" style={{ color: "#0f172a" }}>{campaign.name}</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>{campaign.businessProfile.companyName}</p>
        </div>
        <CampaignStatusToggle campaignId={campaign.id} currentStatus={campaign.status} />
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "#e2e8f0" }}>
        {details.map(({ label, value }) => (
          <div key={label} className="px-4 py-4" style={{ background: "#ffffff" }}>
            <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>{label}</p>
            <p className="text-sm font-medium truncate" style={{ color: "#0f172a" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Applications */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
        <div
          className="px-5 py-3 flex items-center gap-6"
          style={{ borderBottom: "1px solid #f1f5f9", background: "#ffffff" }}
        >
          <p className="text-sm font-medium" style={{ color: "#0f172a" }}>
            Pending ({pending.length})
          </p>
          <p className="text-sm" style={{ color: "#94a3b8" }}>
            Approved ({approved.length})
          </p>
          <p className="text-sm" style={{ color: "#94a3b8" }}>
            Rejected ({rejected.length})
          </p>
        </div>
        <ApplicationReviewTable
          applications={campaign.applications}
          campaignId={campaign.id}
        />
      </div>
    </div>
  );
}

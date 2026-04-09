import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CampaignEditForm } from "@/components/campaigns/campaign-edit-form";
import Link from "next/link";

interface EditCampaignPageProps {
  params: Promise<{ campaignId: string }>;
}

export default async function AdminEditCampaignPage({ params: paramsPromise }: EditCampaignPageProps) {
  const params = await paramsPromise;
  await requireAuth("admin");

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.campaignId },
  });

  if (!campaign) {
    return (
      <div className="p-8">
        <p style={{ color: "var(--error)" }}>Campaign not found.</p>
      </div>
    );
  }

  const serialized = JSON.parse(
    JSON.stringify(campaign, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
  );

  return (
    <div className="p-8">
      <Link
        href="/admin/campaigns"
        className="text-sm mb-6 inline-block transition-opacity hover:opacity-70"
        style={{ color: "var(--accent)" }}
      >
        ← Back to Campaigns
      </Link>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        Edit Campaign
      </h1>
      <CampaignEditForm
        campaign={serialized}
        backUrl="/admin/campaigns"
      />
    </div>
  );
}

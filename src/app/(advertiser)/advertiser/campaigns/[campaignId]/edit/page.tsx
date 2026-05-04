import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CampaignEditForm } from "@/components/campaigns/campaign-edit-form";
import Link from "next/link";

interface EditCampaignPageProps {
  params: Promise<{ campaignId: string }>;
}

export default async function EditCampaignPage({ params: paramsPromise }: EditCampaignPageProps) {
  const params = await paramsPromise;
  const { userId } = await requireAuth("advertiser");

  const advertiser = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { advertiserProfile: { select: { id: true } } },
  });

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.campaignId },
  });

  if (!campaign || !advertiser?.advertiserProfile || campaign.advertiserId !== advertiser.advertiserProfile.id) {
    return (
      <div className="p-8">
        <p style={{ color: "var(--error)" }}>Campaign not found or unauthorized.</p>
      </div>
    );
  }

  const serialized = JSON.parse(
    JSON.stringify(campaign, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
  );

  return (
    <div className="p-8">
      <Link
        href={`/advertiser/campaigns/${params.campaignId}`}
        className="text-sm mb-6 inline-block transition-opacity hover:opacity-70"
        style={{ color: "var(--accent)" }}
      >
        ← Back to Campaign
      </Link>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        Edit Campaign
      </h1>
      <CampaignEditForm
        campaign={serialized}
        backUrl={`/advertiser/campaigns/${params.campaignId}`}
      />
    </div>
  );
}

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
        <p style={{ color: "var(--error)" }}>Campagne niet gevonden.</p>
      </div>
    );
  }

  const [brands, pricingTemplates] = await Promise.all([
    prisma.brand.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: { id: true, name: true, status: true },
      take: 200,
    }),
    prisma.pricingPackageTemplate.findMany({
      where: campaign.pricingTemplateId
        ? { OR: [{ isActive: true }, { id: campaign.pricingTemplateId }] }
        : { isActive: true },
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, price: true, currency: true, isActive: true },
      take: 200,
    }),
  ]);

  const serialized = JSON.parse(
    JSON.stringify(campaign, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
  );
  const brandOptions = JSON.parse(
    JSON.stringify(brands, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
  );
  const pricingTemplateOptions = JSON.parse(
    JSON.stringify(pricingTemplates, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
  );

  return (
    <div className="p-8">
      <Link
        href="/admin/campaigns"
        className="text-sm mb-6 inline-block transition-opacity hover:opacity-70"
        style={{ color: "var(--accent)" }}
      >
        Terug naar campagnes
      </Link>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        Campagne bewerken
      </h1>
      <CampaignEditForm
        campaign={serialized}
        brands={brandOptions}
        pricingTemplates={pricingTemplateOptions}
        backUrl="/admin/campaigns"
      />
    </div>
  );
}

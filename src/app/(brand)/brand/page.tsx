import type { Prisma } from "@prisma/client";
import { LayoutDashboard } from "lucide-react";
import {
  BrandCampaignDashboard,
} from "@/components/brand/brand-campaign-dashboard";
import { EmptyState } from "@/components/ui/empty-state";
import { getCampaignReportLiveData } from "@/lib/admin/campaign-reporting";
import {
  buildBrandPortalCampaignWhere,
  sanitizeBrandCampaignDashboardData,
  selectBrandPortalCampaign,
  sortBrandPortalCampaigns,
} from "@/lib/brand-report-portal";
import { getBrandPortalContext } from "@/lib/brand-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ campaignId?: string }>;
}

const campaignSelect = {
  id: true,
  name: true,
  status: true,
  startsAt: true,
  deadline: true,
  updatedAt: true,
  events: {
    select: { type: true, occurredAt: true },
    orderBy: { occurredAt: "asc" as const },
  },
  brand: { select: { id: true, name: true } },
} as const;

type BrandPortalCampaign = Prisma.CampaignGetPayload<{ select: typeof campaignSelect }>;

export default async function BrandPortalPage({ searchParams }: PageProps) {
  const { campaignId } = await searchParams;
  const context = await getBrandPortalContext();
  const campaigns = sortBrandPortalCampaigns<BrandPortalCampaign>(await prisma.campaign.findMany({
    where: buildBrandPortalCampaignWhere(context.brandIds),
    select: campaignSelect,
    orderBy: [{ updatedAt: "desc" }],
  }));
  const selectedCampaign = selectBrandPortalCampaign(campaigns, campaignId);

  if (!selectedCampaign) {
    return (
      <EmptyState
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Nog geen campagnes zichtbaar"
        description={
          context.isAdminPreview
            ? "Zodra een merk met actieve /brand-toegang een actieve of afgeronde campagne heeft, verschijnt die hier automatisch."
            : "Actieve en afgeronde campagnes verschijnen hier automatisch."
        }
        primaryCta={context.isAdminPreview ? { label: "Naar /brand toegang", href: "/admin/client-access" } : undefined}
        secondaryCta={context.isAdminPreview ? { label: "Naar campagnes", href: "/admin/campaigns" } : undefined}
      />
    );
  }

  const liveData = await getCampaignReportLiveData({
    campaignId: selectedCampaign.id,
  });

  if (!liveData) {
    return (
      <EmptyState
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Campagnedata tijdelijk niet beschikbaar"
        description="De campagne is zichtbaar, maar de meetdata kon niet worden geladen."
      />
    );
  }

  return (
    <BrandCampaignDashboard
      selectedCampaignId={selectedCampaign.id}
      selectedCampaignStatus={selectedCampaign.status as "active" | "completed"}
      data={sanitizeBrandCampaignDashboardData(liveData, selectedCampaign.events)}
    />
  );
}

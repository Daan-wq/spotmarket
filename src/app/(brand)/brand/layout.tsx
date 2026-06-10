import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PostHogIdentify } from "@/components/providers/posthog-identify";
import {
  buildBrandPortalCampaignWhere,
  sortBrandPortalCampaigns,
  type BrandPortalCampaignOption,
} from "@/lib/brand-report-portal";
import { getBrandPortalContext } from "@/lib/brand-auth";
import { prisma } from "@/lib/prisma";
import { BrandCampaignSelector } from "./_components/brand-campaign-selector";
import { BrandMobileHeader } from "./_components/brand-mobile-header";
import { BrandSidebar } from "./_components/brand-sidebar";

export default async function BrandLayout({ children }: { children: ReactNode }) {
  const context = await getBrandPortalContext();
  const brandNames = context.memberships.map((membership) => membership.brand.name);
  const identifyUserId = context.user?.id ?? "admin-brand-preview";
  const campaigns = sortBrandPortalCampaigns(await prisma.campaign.findMany({
    where: buildBrandPortalCampaignWhere(context.brandIds),
    select: {
      id: true,
      name: true,
      status: true,
      startsAt: true,
      deadline: true,
      updatedAt: true,
      brand: { select: { name: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  }));
  const campaignOptions: BrandPortalCampaignOption[] = campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    status: campaign.status as BrandPortalCampaignOption["status"],
    brandName: campaign.brand?.name ?? "Brand",
  }));
  const defaultCampaignId = campaignOptions[0]?.id ?? null;

  return (
    <DashboardShell
      sidebar={
        <BrandSidebar
          email={context.email}
          brandNames={brandNames}
          isAdminPreview={context.isAdminPreview}
          defaultCampaignId={defaultCampaignId}
        />
      }
      mobileChrome={
        <BrandMobileHeader
          brandName={brandNames[0] ?? "Brand"}
          isAdminPreview={context.isAdminPreview}
          defaultCampaignId={defaultCampaignId}
        />
      }
      mainClassName="brand-content"
    >
      <PostHogIdentify userId={identifyUserId} role={context.isAdminPreview ? "admin" : "brand"} />
      <BrandCampaignSelector campaigns={campaignOptions} defaultCampaignId={defaultCampaignId} />
      {children}
    </DashboardShell>
  );
}

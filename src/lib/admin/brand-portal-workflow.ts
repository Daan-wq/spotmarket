import { Prisma } from "@prisma/client";
import type { BrandPortalWorkflowBrand } from "@/components/admin/brand-portal-workflow";

export const brandPortalWorkflowInclude = Prisma.validator<Prisma.BrandInclude>()({
  contacts: {
    select: {
      id: true,
      brandId: true,
      email: true,
      name: true,
      status: true,
      inviteExpiresAt: true,
      invitedAt: true,
      acceptedAt: true,
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  },
  campaigns: {
    where: {
      status: { in: ["active", "completed"] },
    },
    select: {
      id: true,
      status: true,
    },
    orderBy: [{ updatedAt: "desc" }],
  },
  _count: { select: { campaigns: true } },
});

export type BrandWithPortalWorkflowRelations = Prisma.BrandGetPayload<{
  include: typeof brandPortalWorkflowInclude;
}>;

type BrandPortalWorkflowInput = Pick<
  BrandWithPortalWorkflowRelations,
  "id" | "name" | "contactEmail" | "portalEnabled" | "portalCreatedAt" | "contacts" | "campaigns" | "_count"
>;

export function toBrandPortalWorkflowBrand(brand: BrandPortalWorkflowInput): BrandPortalWorkflowBrand {
  const activeCampaigns = brand.campaigns.filter((campaign) => campaign.status === "active");
  const completedCampaigns = brand.campaigns.filter((campaign) => campaign.status === "completed");

  return {
    id: brand.id,
    name: brand.name,
    contactEmail: brand.contactEmail,
    portalEnabled: brand.portalEnabled,
    portalCreatedAt: brand.portalCreatedAt ? brand.portalCreatedAt.toISOString() : null,
    contacts: brand.contacts.map((contact) => ({
      id: contact.id,
      brandId: contact.brandId,
      email: contact.email,
      name: contact.name,
      status: contact.status,
      inviteExpiresAt: contact.inviteExpiresAt ? contact.inviteExpiresAt.toISOString() : null,
      invitedAt: contact.invitedAt.toISOString(),
      acceptedAt: contact.acceptedAt ? contact.acceptedAt.toISOString() : null,
    })),
    campaignsCount: brand._count.campaigns,
    visibleCampaignsCount: brand.portalEnabled
      ? activeCampaigns.length + completedCampaigns.length
      : 0,
    activeCampaignsCount: activeCampaigns.length,
    completedCampaignsCount: completedCampaigns.length,
  };
}

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
  campaignReports: {
    select: {
      id: true,
      title: true,
      status: true,
      visibleToBrand: true,
      brandVisibleAt: true,
      updatedAt: true,
    },
    orderBy: [{ brandVisibleAt: "desc" }, { updatedAt: "desc" }],
  },
  _count: { select: { campaigns: true } },
});

export type BrandWithPortalWorkflowRelations = Prisma.BrandGetPayload<{
  include: typeof brandPortalWorkflowInclude;
}>;

export function toBrandPortalWorkflowBrand(brand: BrandWithPortalWorkflowRelations): BrandPortalWorkflowBrand {
  const visibleReports = brand.campaignReports.filter((report) => report.status === "FINAL" && report.visibleToBrand);
  const latestVisibleReport = visibleReports[0] ?? null;

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
    visibleReportsCount: visibleReports.length,
    finalHiddenReportsCount: brand.campaignReports.filter((report) => report.status === "FINAL" && !report.visibleToBrand).length,
    draftReportsCount: brand.campaignReports.filter((report) => report.status === "DRAFT").length,
    latestVisibleReportId: latestVisibleReport?.id ?? null,
    latestVisibleReportTitle: latestVisibleReport?.title ?? null,
  };
}

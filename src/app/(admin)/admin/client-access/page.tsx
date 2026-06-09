import { BrandPortalWorkflow, type BrandPortalWorkflowBrand } from "@/components/admin/brand-portal-workflow";
import { PageHeader, StatCard } from "@/components/ui/page";
import { serialize } from "@/lib/admin/agency-api";
import { brandPortalWorkflowInclude, toBrandPortalWorkflowBrand } from "@/lib/admin/brand-portal-workflow";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ brandId?: string }>;
}

export default async function ClientAccessPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const brands = await prisma.brand.findMany({
    orderBy: [{ portalEnabled: "desc" }, { status: "asc" }, { updatedAt: "desc" }],
    include: brandPortalWorkflowInclude,
    take: 100,
  });

  const portalBrands = brands.map(toBrandPortalWorkflowBrand).sort((a, b) => {
    if (!sp.brandId) return 0;
    if (a.id === sp.brandId) return -1;
    if (b.id === sp.brandId) return 1;
    return 0;
  });
  const activePortals = portalBrands.filter((brand) => brand.portalEnabled).length;
  const activeLogins = portalBrands.reduce((sum, brand) => sum + brand.contacts.filter((contact) => contact.status === "ACTIVE").length, 0);
  const activeCampaigns = portalBrands.reduce((sum, brand) => sum + brand.activeCampaignsCount, 0);
  const completedCampaigns = portalBrands.reduce((sum, brand) => sum + brand.completedCampaignsCount, 0);

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="/brand"
        title="/brand toegang"
        description="Maak per merk toegang tot de klantomgeving op /brand. Actieve en afgeronde campagnes verschijnen daarna automatisch."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="/brand aangemaakt" value={String(activePortals)} detail="Merken met klanttoegang" />
        <StatCard label="Actieve logins" value={String(activeLogins)} detail="Geaccepteerde brandcontacten" />
        <StatCard label="Actieve campagnes" value={String(activeCampaigns)} detail="Automatisch zichtbaar" />
        <StatCard label="Afgeronde campagnes" value={String(completedCampaigns)} detail="Beschikbaar in historie" />
      </div>

      <BrandPortalWorkflow brands={serialize(portalBrands) as BrandPortalWorkflowBrand[]} />
    </div>
  );
}

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
  const visibleReports = portalBrands.reduce((sum, brand) => sum + brand.visibleReportsCount, 0);
  const hiddenFinalReports = portalBrands.reduce((sum, brand) => sum + brand.finalHiddenReportsCount, 0);

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="/brand"
        title="/brand toegang"
        description="Maak per merk toegang tot de klantomgeving op /brand, nodig brandcontacten uit en publiceer definitieve campagnerapporten."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="/brand aangemaakt" value={String(activePortals)} detail="Merken met klanttoegang" />
        <StatCard label="Actieve logins" value={String(activeLogins)} detail="Geaccepteerde brandcontacten" />
        <StatCard label="Zichtbare rapporten" value={String(visibleReports)} detail="FINAL en gepubliceerd" />
        <StatCard
          label="Nog verborgen"
          value={String(hiddenFinalReports)}
          detail="FINAL maar niet zichtbaar"
          tone={hiddenFinalReports > 0 ? "warning" : "neutral"}
        />
      </div>

      <BrandPortalWorkflow brands={serialize(portalBrands) as BrandPortalWorkflowBrand[]} />
    </div>
  );
}

import { Building2 } from "lucide-react";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { BrandPortalWorkflow, type BrandPortalWorkflowBrand } from "@/components/admin/brand-portal-workflow";
import { prisma } from "@/lib/prisma";
import { formatCurrency, titleCaseEnum } from "@/lib/admin/agency-format";
import { serialize } from "@/lib/admin/agency-api";
import { brandPortalWorkflowInclude, toBrandPortalWorkflowBrand } from "@/lib/admin/brand-portal-workflow";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      onboarding: true,
      ...brandPortalWorkflowInclude,
      campaigns: { select: { id: true, status: true } },
      productionAssignments: { select: { id: true, status: true } },
    },
    take: 100,
  });

  const activeBrands = brands.filter((brand) => brand.status === "ACTIVE");
  const onboardingBrands = brands.filter((brand) => brand.status === "ONBOARDING");
  const monthlyValue = activeBrands.reduce((sum, brand) => sum + Number(brand.monthlyValue), 0);
  const withMissingOnboarding = brands.filter((brand) => !brand.onboarding && brand.status !== "PROSPECT");

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Klanten"
        title="Merken"
        description="Externe klantmerken. Campagnes, onboarding, productieopdrachten en waarde komen hier samen."
        actions={[{ label: "Merk toevoegen", href: "/admin/crm?new=brand", icon: Plus }]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Actieve merken" value={String(activeBrands.length)} detail="Verkocht en in levering" />
        <StatCard label="Onboarding" value={String(onboardingBrands.length)} detail="Checklist nog open" />
        <StatCard label="Maandwaarde" value={formatCurrency(monthlyValue)} detail="Actieve merkwaarde" />
        <StatCard label="Onboarding nodig" value={String(withMissingOnboarding.length)} detail="Merk bestaat zonder checklist" tone={withMissingOnboarding.length > 0 ? "warning" : "neutral"} />
      </div>

      <section>
        <SectionHeader title="Merkdatabase" description="Strakke CLIPPING-tabel, compact genoeg voor adminwerk en toch neutraal en leesbaar." />
        <DataTable
          rows={brands}
          rowKey={(brand) => brand.id}
          emptyState={<EmptyState icon={<Building2 className="h-5 w-5" />} title="Nog geen merken" description="Zet CRM-leads om naar merken of voeg merken toe via de admin-API om onboarding te starten." />}
          columns={[
            {
              key: "brand",
              header: "Merk",
              cell: (brand) => (
                <div>
                  <p className="font-semibold text-neutral-950">{brand.name}</p>
                  <p className="mt-1 text-xs text-neutral-500">{brand.website || brand.contactEmail || brand.niche || "Geen contactgegevens"}</p>
                </div>
              ),
            },
            { key: "status", header: "Status", cell: (brand) => <Badge variant={brand.status === "ACTIVE" ? "verified" : brand.status === "CHURNED" ? "failed" : "neutral"}>{titleCaseEnum(brand.status)}</Badge> },
            { key: "owner", header: "Eigenaar", cell: (brand) => brand.owner || "-" },
            { key: "value", header: "Maandwaarde", align: "right", cell: (brand) => formatCurrency(brand.monthlyValue, brand.currency) },
            { key: "campaigns", header: "Campagnes", align: "right", cell: (brand) => brand.campaigns.length },
            { key: "portal", header: "Brandpagina", align: "right", cell: (brand) => brand.portalEnabled ? <Badge variant="verified">Actief</Badge> : <Badge variant="pending">Niet aangemaakt</Badge> },
            {
              key: "production",
              header: "Opdrachten",
              align: "right",
              cell: (brand) => brand.productionAssignments.filter((assignment) => !["APPROVED", "POSTED", "PAID", "REJECTED"].includes(assignment.status)).length,
            },
            {
              key: "onboarding",
              header: "Onboarding",
              cell: (brand) => brand.onboarding ? (
                <Badge variant={onboardingComplete(brand.onboarding) ? "verified" : "pending"}>
                  {onboardingComplete(brand.onboarding) ? "Compleet" : "Openen"}
                </Badge>
              ) : (
                <Badge variant="failed">Ontbreekt</Badge>
              ),
            },
          ]}
        />
      </section>

      <section>
        <SectionHeader title="Brandportalen" description="Maak de klantpagina aan, verstuur invites en publiceer rapporten vanuit een vaste flow." />
        <BrandPortalWorkflow brands={serialize(brands.map(toBrandPortalWorkflowBrand)) as BrandPortalWorkflowBrand[]} />
      </section>
    </div>
  );
}

function onboardingComplete(onboarding: {
  contractSigned: boolean;
  paymentReceived: boolean;
  kickoffCallDone: boolean;
  brandBriefReceived: boolean;
  contentExamplesReceived: boolean;
  driveFolderCreated: boolean;
  targetAudience: string | null;
  mainProductOrService: string | null;
  hooksAngles: string | null;
  dosAndDonts: string | null;
  assignedClipperIds: string[];
  startDate: Date | null;
  accountManager: string | null;
}) {
  return Boolean(
    onboarding.contractSigned &&
      onboarding.paymentReceived &&
      onboarding.kickoffCallDone &&
      onboarding.brandBriefReceived &&
      onboarding.contentExamplesReceived &&
      onboarding.driveFolderCreated &&
      onboarding.targetAudience &&
      onboarding.mainProductOrService &&
      onboarding.hooksAngles &&
      onboarding.dosAndDonts &&
      onboarding.assignedClipperIds.length > 0 &&
      onboarding.startDate &&
      onboarding.accountManager,
  );
}

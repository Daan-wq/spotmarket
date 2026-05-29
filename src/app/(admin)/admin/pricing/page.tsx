import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { formatCurrency, formatNumber, titleCaseEnum } from "@/lib/admin/agency-format";
import { prisma } from "@/lib/prisma";
import { PricingPackageForm } from "./pricing-package-form";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const packages = await prisma.pricingPackageTemplate.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
    take: 200,
  });
  const activePackages = packages.filter((pkg) => pkg.isActive);
  const starterPrice = activePackages[0]?.price ?? 0;

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Admin"
        title="Prijzen"
        description="Herbruikbare pakketten voor merkvoorstellen, campagne-inrichting en creatorkostenplanning."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Actieve pakketten" value={String(activePackages.length)} detail="Beschikbaar voor nieuw merkwerk" />
        <StatCard label="Eerste pakket" value={formatCurrency(starterPrice)} detail="Laagst gesorteerde actieve optie" />
        <StatCard label="Totaal templates" value={String(packages.length)} detail="Opgeslagen pakketrecords" />
      </div>

      <section>
        <SectionHeader title="Pakket maken" description="Voeg het herhaalbare aanbod toe dat je team aan een merk of campagne kan koppelen." />
        <PricingPackageForm />
      </section>

      <section>
        <SectionHeader title="Opgeslagen pakketten" description="Gebruik deze als eerste bron voordat je een campagnebudget maakt." />
        <DataTable
          rows={packages}
          rowKey={(pkg) => pkg.id}
          emptyState={<EmptyState title="Nog geen prijspakketten" description="Maak hierboven een pakket zodat merkwerk een duidelijk startaanbod heeft." />}
          columns={[
            { key: "name", header: "Package", cell: (pkg) => <span className="font-semibold text-neutral-950">{pkg.name}</span> },
            { key: "price", header: "Prijs", align: "right", cell: (pkg) => formatCurrency(pkg.price, pkg.currency) },
            { key: "platforms", header: "Platforms", cell: (pkg) => pkg.platforms.map((platform) => titleCaseEnum(platform)).join(", ") || "Alles" },
            { key: "clips", header: "Clips", align: "right", cell: (pkg) => formatNumber(pkg.includedClips) },
            { key: "views", header: "Views", align: "right", cell: (pkg) => formatNumber(pkg.includedViews) },
            { key: "margin", header: "Margin", align: "right", cell: (pkg) => `${Number(pkg.marginPercent).toFixed(0)}%` },
            { key: "status", header: "Status", cell: (pkg) => <Badge variant={pkg.isActive ? "verified" : "pending"}>{pkg.isActive ? "Actief" : "Paused"}</Badge> },
          ]}
        />
      </section>
    </div>
  );
}

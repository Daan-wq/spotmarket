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
        title="Pricing"
        description="Reusable package templates for brand proposals, campaign setup, and creator cost planning."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Active packages" value={String(activePackages.length)} detail="Available for new brand work" />
        <StatCard label="First package" value={formatCurrency(starterPrice)} detail="Lowest sorted active option" />
        <StatCard label="Total templates" value={String(packages.length)} detail="Saved package records" />
      </div>

      <section>
        <SectionHeader title="Create package" description="Add the repeatable offer your team can attach to a brand or campaign." />
        <PricingPackageForm />
      </section>

      <section>
        <SectionHeader title="Saved packages" description="Use these as the first source of truth before creating a campaign budget." />
        <DataTable
          rows={packages}
          rowKey={(pkg) => pkg.id}
          emptyState={<EmptyState title="No pricing packages yet" description="Create a package above so brand work has a clear starting offer." />}
          columns={[
            { key: "name", header: "Package", cell: (pkg) => <span className="font-semibold text-neutral-950">{pkg.name}</span> },
            { key: "price", header: "Price", align: "right", cell: (pkg) => formatCurrency(pkg.price, pkg.currency) },
            { key: "platforms", header: "Platforms", cell: (pkg) => pkg.platforms.map((platform) => titleCaseEnum(platform)).join(", ") || "Any" },
            { key: "clips", header: "Clips", align: "right", cell: (pkg) => formatNumber(pkg.includedClips) },
            { key: "views", header: "Views", align: "right", cell: (pkg) => formatNumber(pkg.includedViews) },
            { key: "margin", header: "Margin", align: "right", cell: (pkg) => `${Number(pkg.marginPercent).toFixed(0)}%` },
            { key: "status", header: "Status", cell: (pkg) => <Badge variant={pkg.isActive ? "verified" : "pending"}>{pkg.isActive ? "Active" : "Paused"}</Badge> },
          ]}
        />
      </section>
    </div>
  );
}

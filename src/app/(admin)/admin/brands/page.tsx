import { Building2 } from "lucide-react";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { prisma } from "@/lib/prisma";
import { formatCurrency, titleCaseEnum } from "@/lib/admin/agency-format";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      onboarding: true,
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
        eyebrow="Clients"
        title="Brands"
        description="External client brands. Campaigns, onboarding, production assignments, and value roll up here."
        actions={[{ label: "Add brand", href: "/admin/crm?new=brand", icon: Plus }]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Active brands" value={String(activeBrands.length)} detail="Currently sold and delivering" />
        <StatCard label="Onboarding" value={String(onboardingBrands.length)} detail="Checklist still open" />
        <StatCard label="Monthly value" value={formatCurrency(monthlyValue)} detail="Active brand value" />
        <StatCard label="Needs onboarding" value={String(withMissingOnboarding.length)} detail="Brand exists without checklist" tone={withMissingOnboarding.length > 0 ? "warning" : "neutral"} />
      </div>

      <section>
        <SectionHeader title="Brand Database" description="Strict CLIPPING table, dense enough for admin work but still neutral and readable." />
        <DataTable
          rows={brands}
          rowKey={(brand) => brand.id}
          emptyState={<EmptyState icon={<Building2 className="h-5 w-5" />} title="No brands yet" description="Convert CRM leads into brands or add brands through the admin API to start onboarding." />}
          columns={[
            {
              key: "brand",
              header: "Brand",
              cell: (brand) => (
                <div>
                  <p className="font-semibold text-neutral-950">{brand.name}</p>
                  <p className="mt-1 text-xs text-neutral-500">{brand.website || brand.contactEmail || brand.niche || "No contact details"}</p>
                </div>
              ),
            },
            { key: "status", header: "Status", cell: (brand) => <Badge variant={brand.status === "ACTIVE" ? "verified" : brand.status === "CHURNED" ? "failed" : "neutral"}>{titleCaseEnum(brand.status)}</Badge> },
            { key: "owner", header: "Owner", cell: (brand) => brand.owner || "-" },
            { key: "value", header: "Monthly value", align: "right", cell: (brand) => formatCurrency(brand.monthlyValue, brand.currency) },
            { key: "campaigns", header: "Campaigns", align: "right", cell: (brand) => brand.campaigns.length },
            {
              key: "production",
              header: "Assignments",
              align: "right",
              cell: (brand) => brand.productionAssignments.filter((assignment) => !["APPROVED", "POSTED", "PAID", "REJECTED"].includes(assignment.status)).length,
            },
            {
              key: "onboarding",
              header: "Onboarding",
              cell: (brand) => brand.onboarding ? (
                <Badge variant={onboardingComplete(brand.onboarding) ? "verified" : "pending"}>
                  {onboardingComplete(brand.onboarding) ? "Complete" : "Open"}
                </Badge>
              ) : (
                <Badge variant="failed">Missing</Badge>
              ),
            },
          ]}
        />
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

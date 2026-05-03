import Link from "next/link";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { prisma } from "@/lib/prisma";
import { formatCurrencyPrecise, titleCaseEnum } from "@/lib/admin/agency-format";

export const dynamic = "force-dynamic";

export default async function ClippersPage() {
  const clippers = await prisma.creatorProfile.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { email: true } },
      operationalProfile: true,
      applications: {
        where: { status: { in: ["approved", "active"] } },
        select: { campaign: { select: { id: true, name: true, brandId: true } } },
      },
      productionAssignments: {
        where: { status: { notIn: ["APPROVED", "POSTED", "PAID", "REJECTED"] } },
        select: { id: true, campaign: { select: { name: true } } },
      },
      payouts: {
        where: { status: { in: ["pending", "processing"] } },
        select: { amount: true },
      },
    },
    take: 120,
  });

  const assignedBrandIds = Array.from(
    new Set(clippers.flatMap((clipper) => clipper.operationalProfile?.assignedBrandIds ?? [])),
  );
  const brands = assignedBrandIds.length
    ? await prisma.brand.findMany({ where: { id: { in: assignedBrandIds } }, select: { id: true, name: true } })
    : [];
  const brandById = new Map(brands.map((brand) => [brand.id, brand.name]));

  const active = clippers.filter((clipper) => clipper.operationalProfile?.status === "ACTIVE");
  const missingOps = clippers.filter((clipper) => !clipper.operationalProfile);
  const totalCapacity = clippers.reduce((sum, clipper) => sum + (clipper.operationalProfile?.maxClipsPerWeek ?? 0), 0);
  const assignedCount = clippers.filter((clipper) => (clipper.operationalProfile?.assignedBrandIds.length ?? 0) > 0).length;

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Creator Operations"
        title="Clippers"
        description="Operational clipper database with status, capacity, rate, reliability, niches, assigned brands, active work, and payout exposure."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Active clippers" value={String(active.length)} detail="Marked active in ops profile" />
        <StatCard label="Weekly capacity" value={String(totalCapacity)} detail="Max clips/week across database" />
        <StatCard label="Assigned to brands" value={String(assignedCount)} detail="Explicit assigned-brand visibility" />
        <StatCard label="Missing ops profile" value={String(missingOps.length)} detail="Needs operational setup" tone={missingOps.length > 0 ? "warning" : "neutral"} />
      </div>

      <section>
        <SectionHeader title="Clipper Database" description="Admin table is denser, but still CLIPPING: white, neutral, bordered, and action-first." />
        <DataTable
          rows={clippers}
          rowKey={(clipper) => clipper.id}
          emptyState={<EmptyState icon={<Users className="h-5 w-5" />} title="No clippers yet" description="Creator profiles will appear here. Add operational profiles to turn creators into a production database." />}
          columns={[
            {
              key: "clipper",
              header: "Clipper",
              cell: (clipper) => (
                <div>
                  <Link href={`/admin/creators/${clipper.id}`} className="font-semibold text-neutral-950 underline-offset-2 hover:underline">
                    {clipper.displayName}
                  </Link>
                  <p className="mt-1 text-xs text-neutral-500">{clipper.user?.email || "No email"}</p>
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              cell: (clipper) => clipper.operationalProfile ? (
                <Badge variant={clipper.operationalProfile.status === "ACTIVE" ? "verified" : "neutral"}>{titleCaseEnum(clipper.operationalProfile.status)}</Badge>
              ) : (
                <Badge variant="failed">No ops</Badge>
              ),
            },
            {
              key: "reliability",
              header: "Reliability",
              cell: (clipper) => <Badge variant={clipper.operationalProfile?.reliability === "HIGH" ? "verified" : "neutral"}>{titleCaseEnum(clipper.operationalProfile?.reliability ?? "UNKNOWN")}</Badge>,
            },
            { key: "capacity", header: "Capacity", align: "right", cell: (clipper) => clipper.operationalProfile?.maxClipsPerWeek ?? "-" },
            { key: "rate", header: "Rate", align: "right", cell: (clipper) => formatCurrencyPrecise(clipper.operationalProfile?.ratePerClip ?? 0) },
            {
              key: "brands",
              header: "Assigned brands",
              cell: (clipper) => {
                const names = (clipper.operationalProfile?.assignedBrandIds ?? []).map((id) => brandById.get(id) ?? id);
                return names.length > 0 ? names.join(", ") : <span className="text-neutral-400">None</span>;
              },
            },
            {
              key: "campaigns",
              header: "Active campaigns",
              align: "right",
              cell: (clipper) => clipper.applications.length,
            },
            {
              key: "active",
              header: "Active work",
              align: "right",
              cell: (clipper) => clipper.productionAssignments.length,
            },
            {
              key: "owed",
              header: "Payout owed",
              align: "right",
              cell: (clipper) => formatCurrencyPrecise(clipper.payouts.reduce((sum, payout) => sum + Number(payout.amount), 0)),
            },
          ]}
        />
      </section>
    </div>
  );
}

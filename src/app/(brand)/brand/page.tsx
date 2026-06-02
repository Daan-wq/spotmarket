import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ArrowRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, StatCard } from "@/components/ui/page";
import { formatDate, formatNumber } from "@/lib/admin/agency-format";
import { buildBrandVisibleReportWhere } from "@/lib/brand-report-portal";
import { getBrandPortalContext } from "@/lib/brand-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const reportInclude = {
  brand: { select: { id: true, name: true } },
  campaign: { select: { id: true, name: true, deadline: true } },
} as const;

type BrandPortalReport = Prisma.CampaignReportGetPayload<{ include: typeof reportInclude }>;

export default async function BrandPortalPage() {
  const context = await getBrandPortalContext();
  const where: Prisma.CampaignReportWhereInput = context.brandIds
    ? buildBrandVisibleReportWhere(context.brandIds)
    : { status: "FINAL", visibleToBrand: true, brand: { portalEnabled: true } };

  const reports: BrandPortalReport[] = await prisma.campaignReport.findMany({
    where,
    include: reportInclude,
    orderBy: [{ brandVisibleAt: "desc" }, { updatedAt: "desc" }],
    take: 50,
  });

  const latest = reports[0] ?? null;
  const brandCount = new Set(reports.map((report) => report.brandId).filter(Boolean)).size;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Brand portal"
        title={latest ? latest.title : "Campagnerapporten"}
        description="Bekijk vrijgegeven campagnerapporten en eerdere rapportages."
      />

      {reports.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title={context.isAdminPreview ? "Geen brandrapporten in preview" : "Nog geen rapporten zichtbaar"}
          description={
            context.isAdminPreview
              ? "Dit is de klantkant. Maak in admin eerst een brandpagina aan, invite een brandcontact en publiceer daarna een FINAL rapport."
              : "Zodra ClipProfit een definitief rapport vrijgeeft, verschijnt het hier."
          }
          primaryCta={context.isAdminPreview ? { label: "Naar Brandportalen", href: "/admin/brand-portals" } : undefined}
          secondaryCta={context.isAdminPreview ? { label: "Naar Rapportages", href: "/admin/reports" } : undefined}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Zichtbare rapporten" value={formatNumber(reports.length, "nl")} detail="Definitief en vrijgegeven" />
            <StatCard label="Merken" value={formatNumber(Math.max(brandCount, 1), "nl")} detail="Gekoppelde omgeving" />
            <StatCard label="Laatste update" value={formatDate(latest!.brandVisibleAt ?? latest!.updatedAt, "nl")} detail={latest!.campaign?.name ?? "Campagne"} />
          </div>

          <section className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <Badge variant="verified">Zichtbaar</Badge>
                <h2 className="mt-3 text-2xl font-semibold tracking-normal text-neutral-950">{latest!.title}</h2>
                <p className="mt-2 text-sm text-neutral-500">
                  {latest!.brand?.name ?? "Brand"} / {latest!.campaign?.name ?? "Campagne"} / bijgewerkt {formatDate(latest!.updatedAt, "nl")}
                </p>
              </div>
              <Link
                href={`/brand/reports/${latest!.id}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                Open rapport
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section id="history" className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-950">Rapporthistorie</h2>
            <div className="grid gap-3">
              {reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/brand/reports/${report.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-300"
                >
                  <div>
                    <p className="font-semibold text-neutral-950">{report.title}</p>
                    <p className="mt-1 text-sm text-neutral-500">{report.brand?.name ?? "Brand"} / {report.campaign?.name ?? "Campagne"}</p>
                  </div>
                  <span className="text-sm text-neutral-500">{formatDate(report.updatedAt, "nl")}</span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/admin/agency-format";
import { buildBrandVisibleReportWhere } from "@/lib/brand-report-portal";
import { getBrandPortalContext } from "@/lib/brand-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BrandReportsPage() {
  const context = await getBrandPortalContext();
  const where: Prisma.CampaignReportWhereInput = context.brandIds
    ? buildBrandVisibleReportWhere(context.brandIds)
    : { status: "FINAL", visibleToBrand: true, brand: { portalEnabled: true } };
  const reports = await prisma.campaignReport.findMany({
    where,
    select: {
      id: true,
      title: true,
      periodStart: true,
      periodEnd: true,
      brandVisibleAt: true,
      updatedAt: true,
      brand: { select: { name: true } },
      campaign: { select: { name: true } },
    },
    orderBy: [{ brandVisibleAt: "desc" }, { updatedAt: "desc" }],
  });

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        title="Nog geen rapporten gepubliceerd"
        description="Definitieve rapporten verschijnen hier zodra ze voor het merk zijn gepubliceerd."
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="border-b border-neutral-200 pb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Gepubliceerd</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-5xl">Rapporten</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
          Definitieve campagnerapporten met resultaten, financiële kerncijfers en beschikbare publieksdata.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <Link key={report.id} href={`/brand/reports/${report.id}`} className="rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-400">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">{report.brand?.name ?? "Brand"}</p>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-neutral-950">{report.title}</h2>
            <p className="mt-2 text-sm text-neutral-500">{report.campaign.name}</p>
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-neutral-100 pt-4 text-xs text-neutral-500">
              <span>{formatPeriod(report.periodStart, report.periodEnd)}</span>
              <span>{formatDate(report.brandVisibleAt ?? report.updatedAt, "nl")}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function formatPeriod(start: Date | null, end: Date | null) {
  if (!start && !end) return "Volledige campagne";
  if (!start) return `Tot ${formatDate(end, "nl")}`;
  if (!end) return `Vanaf ${formatDate(start, "nl")}`;
  return `${formatDate(start, "nl")} - ${formatDate(end, "nl")}`;
}

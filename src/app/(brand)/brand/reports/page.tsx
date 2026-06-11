import type { Prisma } from "@prisma/client";
import { FileText } from "lucide-react";
import { BrandReportActions } from "@/components/brand/brand-report-actions";
import { BrandReportDocument } from "@/components/brand/brand-report-document";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/admin/agency-format";
import { getCampaignReportLiveData } from "@/lib/admin/campaign-reporting";
import {
  normalizeEditorialContent,
  normalizeSectionSettings,
  normalizeTextList,
  type CampaignReportEditorial,
} from "@/lib/admin/campaign-report-shared";
import {
  buildBrandPortalCampaignWhere,
  buildBrandVisibleReportWhere,
  sanitizeBrandReportLiveData,
  selectBrandPortalCampaign,
  selectBrandPortalReport,
  sortBrandPortalCampaigns,
} from "@/lib/brand-report-portal";
import { getBrandPortalContext } from "@/lib/brand-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ campaignId?: string; reportId?: string }>;
}

const reportInclude = {
  brand: { select: { id: true, name: true } },
  campaign: { select: { id: true, name: true } },
} as const;

type ReportWithRelations = Prisma.CampaignReportGetPayload<{ include: typeof reportInclude }>;

export default async function BrandReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const context = await getBrandPortalContext();
  const campaigns = sortBrandPortalCampaigns(await prisma.campaign.findMany({
    where: buildBrandPortalCampaignWhere(context.brandIds),
    select: {
      id: true,
      name: true,
      status: true,
      startsAt: true,
      deadline: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }],
  }));
  const selectedCampaign = selectBrandPortalCampaign(campaigns, params.campaignId);

  if (!selectedCampaign) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        title="Nog geen campagne beschikbaar"
        description="Een definitief rapport verschijnt zodra een actieve of afgeronde campagne beschikbaar is."
      />
    );
  }

  const visibleWhere: Prisma.CampaignReportWhereInput = context.brandIds
    ? buildBrandVisibleReportWhere(context.brandIds)
    : { status: "FINAL", visibleToBrand: true, brand: { portalEnabled: true } };
  const reports: ReportWithRelations[] = await prisma.campaignReport.findMany({
    where: {
      ...visibleWhere,
      campaignId: selectedCampaign.id,
    },
    include: reportInclude,
    orderBy: [{ brandVisibleAt: "desc" }, { updatedAt: "desc" }],
  });
  const report = selectBrandPortalReport(reports, selectedCampaign.id, params.reportId);

  if (!report) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        title="Nog geen definitief rapport"
        description="Voor deze campagne is nog geen definitief rapport voor het merk gepubliceerd."
      />
    );
  }

  const liveData = await getCampaignReportLiveData({
    campaignId: report.campaignId,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    dataScope: "brand",
  });

  if (!liveData) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        title="Rapportdata tijdelijk niet beschikbaar"
        description="Het definitieve rapport bestaat, maar de actuele campagnedata kon niet worden geladen."
      />
    );
  }

  return (
    <div className="space-y-6 pb-12 pt-8">
      <header className="report-studio-chrome flex flex-col gap-5 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Definitief rapport
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-neutral-950">
            {report.title}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {report.campaign.name} · gepubliceerd {formatDate(report.brandVisibleAt ?? report.updatedAt, "nl")}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {reports.length > 1 ? (
            <form action="/brand/reports" method="get" className="flex items-end gap-2">
              <input type="hidden" name="campaignId" value={selectedCampaign.id} />
              <label className="grid gap-1 text-xs font-semibold text-neutral-500">
                Rapportversie
                <select
                  name="reportId"
                  defaultValue={report.id}
                  className="h-11 min-w-56 border-0 border-b-2 border-neutral-950 bg-white px-0 text-sm font-semibold text-neutral-950 outline-none"
                >
                  {reports.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} · {formatDate(item.brandVisibleAt ?? item.updatedAt, "nl")}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="h-11 px-3 text-sm font-semibold text-neutral-700 hover:text-neutral-950">
                Openen
              </button>
            </form>
          ) : null}
          <BrandReportActions reportId={report.id} />
        </div>
      </header>

      <BrandReportDocument
        report={report}
        data={sanitizeBrandReportLiveData(liveData)}
        editorial={buildEditorial(report)}
      />
    </div>
  );
}

function buildEditorial(report: ReportWithRelations): CampaignReportEditorial {
  return {
    title: report.title,
    executiveSummary: report.executiveSummary,
    keyTakeaways: normalizeTextList(report.keyTakeaways),
    learnings: normalizeTextList(report.learnings),
    nextCampaignRecommendations: normalizeTextList(report.nextCampaignRecommendations),
    sectionSettings: normalizeSectionSettings(report.sectionSettings),
    editorialContent: normalizeEditorialContent(report.editorialContent),
  };
}

import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { BrandReportDocument } from "@/components/brand/brand-report-document";
import { getCampaignReportLiveData } from "@/lib/admin/campaign-reporting";
import {
  normalizeEditorialContent,
  normalizeSectionSettings,
  normalizeTextList,
  type CampaignReportEditorial,
} from "@/lib/admin/campaign-report-shared";
import { buildBrandVisibleReportWhere, sanitizeBrandReportLiveData } from "@/lib/brand-report-portal";
import { getBrandPortalContext } from "@/lib/brand-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ reportId: string }>;
}

const reportInclude = {
  brand: { select: { id: true, name: true } },
  campaign: { select: { id: true, name: true } },
} as const;

type ReportWithRelations = Prisma.CampaignReportGetPayload<{ include: typeof reportInclude }>;

export default async function BrandReportPage({ params }: PageProps) {
  const { reportId } = await params;
  const context = await getBrandPortalContext();
  const where: Prisma.CampaignReportWhereInput = context.brandIds
    ? { id: reportId, ...buildBrandVisibleReportWhere(context.brandIds) }
    : { id: reportId, status: "FINAL" as const, visibleToBrand: true, brand: { portalEnabled: true } };
  const report: ReportWithRelations | null = await prisma.campaignReport.findFirst({
    where,
    include: reportInclude,
  });

  if (!report) notFound();

  const liveData = await getCampaignReportLiveData({
    campaignId: report.campaignId,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
  });

  if (!liveData) notFound();

  return (
    <BrandReportDocument
      report={report}
      data={sanitizeBrandReportLiveData(liveData)}
      editorial={buildEditorial(report)}
    />
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

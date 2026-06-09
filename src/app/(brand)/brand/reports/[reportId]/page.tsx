import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { BrandReportDocument } from "@/components/brand/brand-report-document";
import { getCampaignReportLiveData } from "@/lib/admin/campaign-reporting";
import {
  buildBrandVisibleReportWhere,
  sanitizeBrandReportLiveData,
} from "@/lib/brand-report-portal";
import { getBrandPortalContext } from "@/lib/brand-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ reportId: string }>;
}

export default async function BrandReportPage({ params }: PageProps) {
  const { reportId } = await params;
  const context = await getBrandPortalContext();
  const where: Prisma.CampaignReportWhereInput = context.brandIds
    ? { id: reportId, ...buildBrandVisibleReportWhere(context.brandIds) }
    : { id: reportId, status: "FINAL", visibleToBrand: true, brand: { portalEnabled: true } };
  const report = await prisma.campaignReport.findFirst({
    where,
    select: {
      id: true,
      title: true,
      campaignId: true,
      periodStart: true,
      periodEnd: true,
      brandVisibleAt: true,
      updatedAt: true,
    },
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
    />
  );
}

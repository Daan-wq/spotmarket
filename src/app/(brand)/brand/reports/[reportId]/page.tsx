import type { Prisma } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { buildBrandVisibleReportWhere } from "@/lib/brand-report-portal";
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
    : { id: reportId, status: "FINAL" as const, visibleToBrand: true, brand: { portalEnabled: true } };
  const report = await prisma.campaignReport.findFirst({
    where,
    select: { campaignId: true },
  });

  if (!report) notFound();
  redirect(`/brand?campaignId=${encodeURIComponent(report.campaignId)}`);
}

import type { Prisma } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { buildBrandVisibleReportWhere } from "@/lib/brand-report-portal";
import { getBrandPortalContext } from "@/lib/brand-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LegacyBrandReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const context = await getBrandPortalContext();
  const where: Prisma.CampaignReportWhereInput = context.brandIds
    ? { id: reportId, ...buildBrandVisibleReportWhere(context.brandIds) }
    : { id: reportId, status: "FINAL", visibleToBrand: true, brand: { portalEnabled: true } };
  const report = await prisma.campaignReport.findFirst({
    where,
    select: { id: true, campaignId: true },
  });

  if (!report) notFound();
  redirect(`/brand/reports?campaignId=${encodeURIComponent(report.campaignId)}&reportId=${encodeURIComponent(report.id)}`);
}

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonError, serialize } from "@/lib/admin/agency-api";
import { campaignReportUpdateSchema } from "@/lib/admin/campaign-report-validation";
import { getCampaignReportLiveData } from "@/lib/admin/campaign-reporting";
import { prisma } from "@/lib/prisma";

const reportInclude = {
  brand: { select: { id: true, name: true } },
  campaign: { select: { id: true, name: true } },
} as const;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    await requireAuth("admin");
    const { id } = await params;
    const report = await prisma.campaignReport.findUnique({
      where: { id },
      include: reportInclude,
    });

    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const liveData = await getCampaignReportLiveData({
      campaignId: report.campaignId,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
    });

    return NextResponse.json({ report: serialize(report), liveData });
  } catch (error) {
    return jsonError(error, "[GET /api/admin/campaign-reports/[id]]");
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;
    const parsed = campaignReportUpdateSchema.parse(await req.json());
    const data: Record<string, unknown> = {};

    for (const key of [
      "title",
      "status",
      "executiveSummary",
      "keyTakeaways",
      "learnings",
      "nextCampaignRecommendations",
      "sectionSettings",
    ] as const) {
      if (parsed[key] !== undefined) data[key] = parsed[key];
    }
    if (parsed.periodStart !== undefined) data.periodStart = parsed.periodStart;
    if (parsed.periodEnd !== undefined) data.periodEnd = parsed.periodEnd;

    const report = await prisma.campaignReport.update({
      where: { id },
      data,
      include: reportInclude,
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "campaignReport.update",
        entityType: "CampaignReport",
        entityId: report.id,
        metadata: { campaignId: report.campaignId, status: report.status },
      },
    });

    const liveData = await getCampaignReportLiveData({
      campaignId: report.campaignId,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
    });

    return NextResponse.json({ report: serialize(report), liveData });
  } catch (error) {
    return jsonError(error, "[PATCH /api/admin/campaign-reports/[id]]");
  }
}

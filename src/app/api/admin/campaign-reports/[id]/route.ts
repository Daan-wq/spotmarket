import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonError, serialize } from "@/lib/admin/agency-api";
import { campaignReportUpdateSchema } from "@/lib/admin/campaign-report-validation";
import { getCampaignReportLiveData } from "@/lib/admin/campaign-reporting";
import { prisma } from "@/lib/prisma";

const reportInclude = {
  brand: { select: { id: true, name: true, portalEnabled: true, portalCreatedAt: true } },
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
    let auditAction = "campaignReport.update";
    let auditMetadata: Record<string, unknown> | null = null;

    for (const key of [
      "title",
      "status",
      "executiveSummary",
      "keyTakeaways",
      "learnings",
      "nextCampaignRecommendations",
      "sectionSettings",
      "editorialContent",
    ] as const) {
      if (parsed[key] !== undefined) data[key] = parsed[key];
    }
    if (parsed.periodStart !== undefined) data.periodStart = parsed.periodStart;
    if (parsed.periodEnd !== undefined) data.periodEnd = parsed.periodEnd;
    if (parsed.visibleToBrand !== undefined) {
      const current = await prisma.campaignReport.findUnique({
        where: { id },
        select: {
          status: true,
          campaignId: true,
          brandId: true,
          brand: { select: { portalEnabled: true, name: true } },
        },
      });

      if (!current) return NextResponse.json({ error: "Report not found" }, { status: 404 });
      if (parsed.visibleToBrand && current.status !== "FINAL") {
        return NextResponse.json(
          { error: "Only final reports can be made visible to brands." },
          { status: 400 },
        );
      }
      if (parsed.visibleToBrand && (!current.brandId || !current.brand?.portalEnabled)) {
        return NextResponse.json(
          { error: "Maak eerst /brand toegang aan voordat je dit rapport zichtbaar maakt." },
          { status: 400 },
        );
      }

      data.visibleToBrand = parsed.visibleToBrand;
      data.brandVisibleAt = parsed.visibleToBrand ? new Date() : null;
      data.brandVisibleBy = parsed.visibleToBrand ? userId : null;
      auditAction = "campaignReport.publishToBrand";
      auditMetadata = { campaignId: current.campaignId, visibleToBrand: parsed.visibleToBrand };
    }

    const report = await prisma.campaignReport.update({
      where: { id },
      data,
      include: reportInclude,
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: auditAction,
        entityType: "CampaignReport",
        entityId: report.id,
        metadata: (auditMetadata ?? { campaignId: report.campaignId, status: report.status }) as Prisma.InputJsonValue,
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

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { jsonError, serialize } from "@/lib/admin/agency-api";
import { campaignReportCreateSchema } from "@/lib/admin/campaign-report-validation";
import { getCampaignReportLiveData } from "@/lib/admin/campaign-reporting";
import { prisma } from "@/lib/prisma";

const reportInclude = {
  brand: { select: { id: true, name: true, portalEnabled: true, portalCreatedAt: true } },
  campaign: { select: { id: true, name: true } },
} as const;

export async function GET(req: Request) {
  try {
    await requireAuth("admin");
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId");
    const campaignId = searchParams.get("campaignId");
    const status = searchParams.get("status");
    const q = searchParams.get("q")?.trim();

    const where: Record<string, unknown> = {};
    if (brandId) where.brandId = brandId;
    if (campaignId) where.campaignId = campaignId;
    if (status === "DRAFT" || status === "FINAL") where.status = status;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
        { campaign: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const reports = await prisma.campaignReport.findMany({
      where,
      include: reportInclude,
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ reports: serialize(reports) });
  } catch (error) {
    return jsonError(error, "[GET /api/admin/campaign-reports]");
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth("admin");
    const parsed = campaignReportCreateSchema.parse(await req.json());
    const liveData = await getCampaignReportLiveData({
      campaignId: parsed.campaignId,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      dataScope: "brand",
    });

    if (!liveData) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const periodStart = parsed.periodStart ?? (liveData.campaign.startsAt ? new Date(liveData.campaign.startsAt) : null);
    const periodEnd = parsed.periodEnd ?? new Date(liveData.campaign.deadline);
    const defaults = liveData.defaults;

    const report = await prisma.campaignReport.create({
      data: {
        campaignId: parsed.campaignId,
        brandId: liveData.campaign.brandId,
        title: parsed.title ?? defaults.title,
        status: parsed.status ?? "DRAFT",
        periodStart,
        periodEnd,
        executiveSummary: parsed.executiveSummary ?? defaults.executiveSummary,
        keyTakeaways: parsed.keyTakeaways ?? defaults.keyTakeaways,
        learnings: parsed.learnings ?? defaults.learnings,
        nextCampaignRecommendations: parsed.nextCampaignRecommendations ?? defaults.nextCampaignRecommendations,
        sectionSettings: parsed.sectionSettings ?? defaults.sectionSettings,
        editorialContent: (parsed.editorialContent ?? defaults.editorialContent) as unknown as Prisma.InputJsonValue,
        createdBy: userId,
      },
      include: reportInclude,
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "campaignReport.create",
        entityType: "CampaignReport",
        entityId: report.id,
        metadata: { campaignId: parsed.campaignId, status: report.status },
      },
    });

    return NextResponse.json({ report: serialize(report), liveData }, { status: 201 });
  } catch (error) {
    return jsonError(error, "[POST /api/admin/campaign-reports]");
  }
}

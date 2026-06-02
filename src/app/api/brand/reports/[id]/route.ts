import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getActiveBrandMembershipsForSupabaseId } from "@/lib/brand-auth";
import { getCampaignReportLiveData } from "@/lib/admin/campaign-reporting";
import { jsonError, serialize } from "@/lib/admin/agency-api";
import { buildBrandVisibleReportWhere, sanitizeBrandReportLiveData } from "@/lib/brand-report-portal";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth("brand", "admin");
    const { id } = await params;
    let where: Record<string, unknown> = { id, status: "FINAL", visibleToBrand: true, brand: { portalEnabled: true } };

    if (auth.role === "brand") {
      const user = await getActiveBrandMembershipsForSupabaseId(auth.userId);
      const brandIds = user?.brandContacts.map((contact) => contact.brandId) ?? [];
      if (brandIds.length === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      where = { id, ...buildBrandVisibleReportWhere(brandIds) };
    }

    const report = await prisma.campaignReport.findFirst({
      where,
      include: {
        brand: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
    });
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const liveData = await getCampaignReportLiveData({
      campaignId: report.campaignId,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
    });
    if (!liveData) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    return NextResponse.json({
      report: serialize(report),
      liveData: sanitizeBrandReportLiveData(liveData),
    });
  } catch (error) {
    return jsonError(error, "[GET /api/brand/reports/[id]]");
  }
}

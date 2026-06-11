import { getCampaignReportLiveData } from "@/lib/admin/campaign-reporting";
import { jsonError } from "@/lib/admin/agency-api";
import {
  normalizeEditorialContent,
  normalizeSectionSettings,
  normalizeTextList,
} from "@/lib/admin/campaign-report-shared";
import { requireAuth } from "@/lib/auth";
import { getActiveBrandMembershipsForSupabaseId } from "@/lib/brand-auth";
import { buildBrandReportDocumentModel } from "@/lib/brand-report-document-model";
import { renderBrandReportPdf } from "@/lib/brand-report-pdf";
import {
  buildBrandVisibleReportWhere,
  sanitizeBrandReportLiveData,
} from "@/lib/brand-report-portal";
import { prisma } from "@/lib/prisma";
import { pdfResponse, reportPdfFilename } from "@/lib/report-pdf-response";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth("brand");
    const membership = await getActiveBrandMembershipsForSupabaseId(auth.userId);
    const brandIds = membership?.brandContacts.map((contact) => contact.brandId) ?? [];
    if (brandIds.length === 0) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const report = await prisma.campaignReport.findFirst({
      where: {
        id,
        ...buildBrandVisibleReportWhere(brandIds),
      },
      include: {
        brand: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
    });
    if (!report) {
      return Response.json({ error: "Report not found" }, { status: 404 });
    }

    const liveData = await getCampaignReportLiveData({
      campaignId: report.campaignId,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      dataScope: "brand",
    });
    if (!liveData) {
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }

    const data = sanitizeBrandReportLiveData(liveData);
    const editorial = {
      title: report.title,
      executiveSummary: report.executiveSummary,
      keyTakeaways: normalizeTextList(report.keyTakeaways),
      learnings: normalizeTextList(report.learnings),
      nextCampaignRecommendations: normalizeTextList(report.nextCampaignRecommendations),
      sectionSettings: normalizeSectionSettings(report.sectionSettings),
      editorialContent: normalizeEditorialContent(report.editorialContent),
    };
    const model = buildBrandReportDocumentModel({
      report: { title: report.title },
      data,
      editorial,
    });
    const buffer = await renderBrandReportPdf(model);

    return pdfResponse(
      buffer,
      reportPdfFilename(data.campaign.brandName, data.campaign.name),
    );
  } catch (error) {
    return jsonError(error, "[GET /api/brand/reports/[id]/pdf]");
  }
}

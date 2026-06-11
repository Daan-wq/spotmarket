import { getCampaignReportLiveData } from "@/lib/admin/campaign-reporting";
import { jsonError } from "@/lib/admin/agency-api";
import { campaignReportPdfSchema } from "@/lib/admin/campaign-report-validation";
import { createEmptyEditorialContent } from "@/lib/admin/campaign-report-shared";
import { requireAuth } from "@/lib/auth";
import { buildBrandReportDocumentModel } from "@/lib/brand-report-document-model";
import { renderBrandReportPdf } from "@/lib/brand-report-pdf";
import { sanitizeBrandReportLiveData } from "@/lib/brand-report-portal";
import { pdfResponse, reportPdfFilename } from "@/lib/report-pdf-response";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await requireAuth("admin");
    const input = campaignReportPdfSchema.parse(await req.json());
    const liveData = await getCampaignReportLiveData({
      campaignId: input.campaignId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      dataScope: "brand",
    });

    if (!liveData) {
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }

    const data = sanitizeBrandReportLiveData(liveData);
    const editorial = {
      title: input.title,
      executiveSummary: input.executiveSummary,
      keyTakeaways: input.keyTakeaways,
      learnings: input.learnings,
      nextCampaignRecommendations: input.nextCampaignRecommendations,
      sectionSettings: input.sectionSettings,
      editorialContent: input.editorialContent ?? createEmptyEditorialContent(),
    };
    const model = buildBrandReportDocumentModel({
      report: { title: input.title },
      data,
      editorial,
    });
    const buffer = await renderBrandReportPdf(model);

    return pdfResponse(
      buffer,
      reportPdfFilename(data.campaign.brandName, data.campaign.name),
    );
  } catch (error) {
    return jsonError(error, "[POST /api/admin/campaign-reports/pdf]");
  }
}

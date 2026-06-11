import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  getCampaignReportLiveData: vi.fn(),
  sanitizeBrandReportLiveData: vi.fn(),
  buildBrandReportDocumentModel: vi.fn(),
  renderBrandReportPdf: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/admin/campaign-reporting", () => ({
  getCampaignReportLiveData: mocks.getCampaignReportLiveData,
}));
vi.mock("@/lib/brand-report-portal", () => ({
  sanitizeBrandReportLiveData: mocks.sanitizeBrandReportLiveData,
}));
vi.mock("@/lib/brand-report-document-model", () => ({
  buildBrandReportDocumentModel: mocks.buildBrandReportDocumentModel,
}));
vi.mock("@/lib/brand-report-pdf", () => ({
  renderBrandReportPdf: mocks.renderBrandReportPdf,
}));

describe("POST /api/admin/campaign-reports/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ userId: "admin-1", role: "admin" });
    mocks.getCampaignReportLiveData.mockResolvedValue({ defaults: {} });
    mocks.sanitizeBrandReportLiveData.mockReturnValue({
      campaign: {
        brandName: "Betspecialist",
        name: "TikTok zomer",
      },
    });
    mocks.buildBrandReportDocumentModel.mockReturnValue({ title: "Onopgeslagen titel" });
    mocks.renderBrandReportPdf.mockResolvedValue(Buffer.from("%PDF-1.7\nadmin"));
  });

  it("renders unsaved editorial with server-fetched brand metrics", async () => {
    const response = await POST(new Request("http://localhost/api/admin/campaign-reports/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: "campaign-1",
        title: "Onopgeslagen titel",
        periodStart: "2026-05-01T00:00:00.000Z",
        periodEnd: "2026-05-31T00:00:00.000Z",
        executiveSummary: "Onopgeslagen samenvatting",
        keyTakeaways: ["Onopgeslagen inzicht"],
        learnings: [],
        nextCampaignRecommendations: [],
        sectionSettings: { cover: true },
        editorialContent: {
          templateBlocks: { "summary.body": "Actuele inline redactie" },
        },
      }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.getCampaignReportLiveData).toHaveBeenCalledWith({
      campaignId: "campaign-1",
      periodStart: new Date("2026-05-01T00:00:00.000Z"),
      periodEnd: new Date("2026-05-31T00:00:00.000Z"),
      dataScope: "brand",
    });
    expect(mocks.buildBrandReportDocumentModel).toHaveBeenCalledWith(expect.objectContaining({
      report: { title: "Onopgeslagen titel" },
      editorial: expect.objectContaining({
        executiveSummary: "Onopgeslagen samenvatting",
        keyTakeaways: ["Onopgeslagen inzicht"],
        editorialContent: expect.objectContaining({
          templateBlocks: { "summary.body": "Actuele inline redactie" },
        }),
      }),
    }));
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain(
      'filename="betspecialist-tiktok-zomer-rapport.pdf"',
    );
    const body = Buffer.from(await response.arrayBuffer());
    expect(body.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("rejects invalid client payloads before loading metrics", async () => {
    const response = await POST(new Request("http://localhost/api/admin/campaign-reports/pdf", {
      method: "POST",
      body: JSON.stringify({ campaignId: "" }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.getCampaignReportLiveData).not.toHaveBeenCalled();
  });
});

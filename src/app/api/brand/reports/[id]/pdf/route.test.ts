import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  getActiveBrandMembershipsForSupabaseId: vi.fn(),
  campaignReportFindFirst: vi.fn(),
  getCampaignReportLiveData: vi.fn(),
  sanitizeBrandReportLiveData: vi.fn(),
  buildBrandReportDocumentModel: vi.fn(),
  renderBrandReportPdf: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/brand-auth", () => ({
  getActiveBrandMembershipsForSupabaseId: mocks.getActiveBrandMembershipsForSupabaseId,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaignReport: {
      findFirst: mocks.campaignReportFindFirst,
    },
  },
}));
vi.mock("@/lib/admin/campaign-reporting", () => ({
  getCampaignReportLiveData: mocks.getCampaignReportLiveData,
}));
vi.mock("@/lib/brand-report-portal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/brand-report-portal")>();
  return {
    ...actual,
    sanitizeBrandReportLiveData: mocks.sanitizeBrandReportLiveData,
  };
});
vi.mock("@/lib/brand-report-document-model", () => ({
  buildBrandReportDocumentModel: mocks.buildBrandReportDocumentModel,
}));
vi.mock("@/lib/brand-report-pdf", () => ({
  renderBrandReportPdf: mocks.renderBrandReportPdf,
}));

const params = { params: Promise.resolve({ id: "report-1" }) };
const report = {
  id: "report-1",
  title: "Betspecialist eindrapport",
  campaignId: "campaign-1",
  periodStart: new Date("2026-05-01T00:00:00.000Z"),
  periodEnd: new Date("2026-05-31T00:00:00.000Z"),
  executiveSummary: "Definitieve samenvatting",
  keyTakeaways: ["Veel bereik"],
  learnings: ["Herhaal sterke hooks"],
  nextCampaignRecommendations: ["Activeer creators opnieuw"],
  sectionSettings: { cover: true },
  editorialContent: {},
  status: "FINAL",
  visibleToBrand: true,
  brand: { id: "brand-1", name: "Betspecialist" },
  campaign: { id: "campaign-1", name: "TikTok zomer" },
};

describe("GET /api/brand/reports/[id]/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ userId: "brand-user-1", role: "brand" });
    mocks.getActiveBrandMembershipsForSupabaseId.mockResolvedValue({
      brandContacts: [{ brandId: "brand-1" }],
    });
    mocks.campaignReportFindFirst.mockResolvedValue(report);
    mocks.getCampaignReportLiveData.mockResolvedValue({});
    mocks.sanitizeBrandReportLiveData.mockReturnValue({
      campaign: { brandName: "Betspecialist", name: "TikTok zomer" },
    });
    mocks.buildBrandReportDocumentModel.mockReturnValue({ title: report.title });
    mocks.renderBrandReportPdf.mockResolvedValue(Buffer.from("%PDF-1.7\nbrand"));
  });

  it("requires active membership and a published final report", async () => {
    const response = await GET(
      new Request("http://localhost/api/brand/reports/report-1/pdf"),
      params,
    );

    expect(response.status).toBe(200);
    expect(mocks.campaignReportFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: "report-1",
        brandId: { in: ["brand-1"] },
        brand: { portalEnabled: true },
        status: "FINAL",
        visibleToBrand: true,
      },
    }));
    expect(mocks.getCampaignReportLiveData).toHaveBeenCalledWith({
      campaignId: "campaign-1",
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      dataScope: "brand",
    });
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain(
      'filename="betspecialist-tiktok-zomer-rapport.pdf"',
    );
    const body = Buffer.from(await response.arrayBuffer());
    expect(body.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("blocks users without an active brand membership", async () => {
    mocks.getActiveBrandMembershipsForSupabaseId.mockResolvedValueOnce({ brandContacts: [] });

    const response = await GET(
      new Request("http://localhost/api/brand/reports/report-1/pdf"),
      params,
    );

    expect(response.status).toBe(403);
    expect(mocks.campaignReportFindFirst).not.toHaveBeenCalled();
  });

  it("returns 404 for drafts, hidden reports, and reports outside the membership scope", async () => {
    mocks.campaignReportFindFirst.mockResolvedValueOnce(null);

    const response = await GET(
      new Request("http://localhost/api/brand/reports/report-1/pdf"),
      params,
    );

    expect(response.status).toBe(404);
    expect(mocks.renderBrandReportPdf).not.toHaveBeenCalled();
  });
});

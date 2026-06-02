import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { GET as GET_BY_ID, PATCH } from "./[id]/route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  campaignReportFindMany: vi.fn(),
  campaignReportCreate: vi.fn(),
  campaignReportFindUnique: vi.fn(),
  campaignReportUpdate: vi.fn(),
  auditLogCreate: vi.fn(),
  getCampaignReportLiveData: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaignReport: {
      findMany: routeMocks.campaignReportFindMany,
      create: routeMocks.campaignReportCreate,
      findUnique: routeMocks.campaignReportFindUnique,
      update: routeMocks.campaignReportUpdate,
    },
    auditLog: { create: routeMocks.auditLogCreate },
  },
}));

vi.mock("@/lib/admin/campaign-reporting", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/campaign-reporting")>();
  return {
    ...actual,
    getCampaignReportLiveData: routeMocks.getCampaignReportLiveData,
  };
});

const report = {
  id: "report-1",
  title: "Bram's Fruit Campaign Report",
  status: "DRAFT",
  brandId: "brand-1",
  campaignId: "campaign-1",
  periodStart: new Date("2026-05-01T00:00:00.000Z"),
  periodEnd: new Date("2026-05-31T00:00:00.000Z"),
  executiveSummary: "Strong first run.",
  keyTakeaways: ["TikTok carried delivery."],
  learnings: ["Open with product earlier."],
  nextCampaignRecommendations: ["Invite top creators again."],
  sectionSettings: { audience: true },
  editorialContent: {
    campaignType: "Awareness",
    contentInsights: ["Fast hooks worked best."],
    qualityNote: "Quality review passed.",
  },
  createdBy: "admin-1",
  createdAt: new Date("2026-05-29T08:00:00.000Z"),
  updatedAt: new Date("2026-05-29T09:00:00.000Z"),
  brand: { id: "brand-1", name: "Bram's Fruit", portalEnabled: true },
  campaign: { id: "campaign-1", name: "Bram's Fruit mei" },
};

const liveData = {
  campaign: {
    id: "campaign-1",
    brandId: "brand-1",
    brandName: "Bram's Fruit",
    startsAt: "2026-05-01T00:00:00.000Z",
    deadline: "2026-05-31T00:00:00.000Z",
  },
  defaults: {
    title: "Bram's Fruit Campaign Report",
    executiveSummary: "Default generated summary.",
    keyTakeaways: ["Default takeaway"],
    learnings: ["Default learning"],
    nextCampaignRecommendations: ["Default recommendation"],
    sectionSettings: { audience: true },
    editorialContent: {
      campaignType: "Awareness",
      financialNote: "Budget was used for approved views.",
      contentInsights: ["Default content insight"],
      topContentNotes: {},
      platformRecommendations: {},
      creatorRecommendations: ["Reactivate Alice."],
      qualityNote: "Quality review passed.",
      keyLearnings: ["Default learning"],
      nextCampaignPlan: ["Default recommendation"],
      appendixNote: "",
    },
  },
};

describe("GET /api/admin/campaign-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-1" });
    routeMocks.campaignReportFindMany.mockResolvedValue([report]);
  });

  it("requires admin auth", async () => {
    routeMocks.requireAuth.mockRejectedValueOnce(new Error("Unauthorized"));

    const response = await GET(new Request("http://localhost/api/admin/campaign-reports"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(routeMocks.campaignReportFindMany).not.toHaveBeenCalled();
  });

  it("filters report history by brand, campaign, status, and search", async () => {
    const response = await GET(
      new Request("http://localhost/api/admin/campaign-reports?brandId=brand-1&campaignId=campaign-1&status=FINAL&q=fruit"),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.campaignReportFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          brandId: "brand-1",
          campaignId: "campaign-1",
          status: "FINAL",
          OR: expect.arrayContaining([
            { title: { contains: "fruit", mode: "insensitive" } },
            { brand: { name: { contains: "fruit", mode: "insensitive" } } },
            { campaign: { name: { contains: "fruit", mode: "insensitive" } } },
          ]),
        }),
      }),
    );
    await expect(response.json()).resolves.toEqual({
      reports: [
        expect.objectContaining({
          id: "report-1",
          updatedAt: "2026-05-29T09:00:00.000Z",
        }),
      ],
    });
  });
});

describe("POST /api/admin/campaign-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-1" });
    routeMocks.getCampaignReportLiveData.mockResolvedValue(liveData);
    routeMocks.campaignReportCreate.mockResolvedValue(report);
    routeMocks.auditLogCreate.mockResolvedValue({});
  });

  it("validates required create fields", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/campaign-reports", {
        method: "POST",
        body: JSON.stringify({ title: "Missing campaign" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(routeMocks.campaignReportCreate).not.toHaveBeenCalled();
  });

  it("creates editorial content with generated defaults and audits the action", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/campaign-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: "campaign-1" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(routeMocks.getCampaignReportLiveData).toHaveBeenCalledWith({
      campaignId: "campaign-1",
      periodStart: undefined,
      periodEnd: undefined,
    });
    expect(routeMocks.campaignReportCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          campaignId: "campaign-1",
          brandId: "brand-1",
          title: "Bram's Fruit Campaign Report",
          status: "DRAFT",
          executiveSummary: "Default generated summary.",
          keyTakeaways: ["Default takeaway"],
          editorialContent: expect.objectContaining({
            campaignType: "Awareness",
            contentInsights: ["Default content insight"],
          }),
          createdBy: "admin-1",
        }),
      }),
    );
    expect(routeMocks.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "campaignReport.create",
          entityId: "report-1",
        }),
      }),
    );
  });
});

describe("GET /api/admin/campaign-reports/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-1" });
    routeMocks.campaignReportFindUnique.mockResolvedValue(report);
    routeMocks.getCampaignReportLiveData.mockResolvedValue(liveData);
  });

  it("loads saved editorial content with fresh live metrics", async () => {
    const response = await GET_BY_ID(
      new Request("http://localhost/api/admin/campaign-reports/report-1"),
      { params: Promise.resolve({ id: "report-1" }) },
    );

    expect(response.status).toBe(200);
    expect(routeMocks.getCampaignReportLiveData).toHaveBeenCalledWith({
      campaignId: "campaign-1",
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
    });
    await expect(response.json()).resolves.toEqual({
      report: expect.objectContaining({ id: "report-1" }),
      liveData,
    });
  });
});

describe("PATCH /api/admin/campaign-reports/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-1" });
    routeMocks.campaignReportUpdate.mockResolvedValue({ ...report, status: "FINAL" });
    routeMocks.auditLogCreate.mockResolvedValue({});
    routeMocks.getCampaignReportLiveData.mockResolvedValue(liveData);
  });

  it("updates editorial content, status, and reloads live metrics", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/admin/campaign-reports/report-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "FINAL",
          executiveSummary: "Client ready summary.",
          keyTakeaways: ["Best delivery came from TikTok."],
          editorialContent: { campaignType: "Launch", contentInsights: ["Product-first clips won."] },
        }),
      }),
      { params: Promise.resolve({ id: "report-1" }) },
    );

    expect(response.status).toBe(200);
    expect(routeMocks.campaignReportUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "report-1" },
        data: {
          status: "FINAL",
          executiveSummary: "Client ready summary.",
          keyTakeaways: ["Best delivery came from TikTok."],
          editorialContent: expect.objectContaining({
            campaignType: "Launch",
            contentInsights: ["Product-first clips won."],
          }),
        },
      }),
    );
    expect(routeMocks.getCampaignReportLiveData).toHaveBeenCalledWith({
      campaignId: "campaign-1",
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
    });
    expect(routeMocks.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "campaignReport.update",
          metadata: { campaignId: "campaign-1", status: "FINAL" },
        }),
      }),
    );
  });

  it("does not publish draft reports to brands", async () => {
    routeMocks.campaignReportFindUnique.mockResolvedValueOnce({ ...report, status: "DRAFT" });

    const response = await PATCH(
      new Request("http://localhost/api/admin/campaign-reports/report-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleToBrand: true }),
      }),
      { params: Promise.resolve({ id: "report-1" }) },
    );

    expect(response.status).toBe(400);
    expect(routeMocks.campaignReportUpdate).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Only final reports can be made visible to brands.",
    });
  });

  it("publishes final reports to brands with audit metadata", async () => {
    routeMocks.campaignReportFindUnique.mockResolvedValueOnce({ ...report, status: "FINAL" });
    routeMocks.campaignReportUpdate.mockResolvedValueOnce({
      ...report,
      status: "FINAL",
      visibleToBrand: true,
      brandVisibleAt: new Date("2026-06-01T12:00:00.000Z"),
      brandVisibleBy: "admin-1",
    });

    const response = await PATCH(
      new Request("http://localhost/api/admin/campaign-reports/report-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleToBrand: true }),
      }),
      { params: Promise.resolve({ id: "report-1" }) },
    );

    expect(response.status).toBe(200);
    expect(routeMocks.campaignReportUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "report-1" },
        data: expect.objectContaining({
          visibleToBrand: true,
          brandVisibleAt: expect.any(Date),
          brandVisibleBy: "admin-1",
        }),
      }),
    );
    expect(routeMocks.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "campaignReport.publishToBrand",
          metadata: { campaignId: "campaign-1", visibleToBrand: true },
        }),
      }),
    );
  });

  it("does not publish reports before /brand access exists", async () => {
    routeMocks.campaignReportFindUnique.mockResolvedValueOnce({
      ...report,
      status: "FINAL",
      brand: { id: "brand-1", name: "Bram's Fruit", portalEnabled: false },
    });

    const response = await PATCH(
      new Request("http://localhost/api/admin/campaign-reports/report-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleToBrand: true }),
      }),
      { params: Promise.resolve({ id: "report-1" }) },
    );

    expect(response.status).toBe(400);
    expect(routeMocks.campaignReportUpdate).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Maak eerst /brand toegang aan voordat je dit rapport zichtbaar maakt.",
    });
  });
});

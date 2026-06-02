import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  getActiveBrandMembershipsForSupabaseId: vi.fn(),
  getCampaignReportLiveData: vi.fn(),
  campaignReportFindFirst: vi.fn(),
  sanitizeBrandReportLiveData: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/brand-auth", () => ({
  getActiveBrandMembershipsForSupabaseId: routeMocks.getActiveBrandMembershipsForSupabaseId,
}));

vi.mock("@/lib/admin/campaign-reporting", () => ({
  getCampaignReportLiveData: routeMocks.getCampaignReportLiveData,
}));

vi.mock("@/lib/brand-report-portal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/brand-report-portal")>();
  return {
    ...actual,
    sanitizeBrandReportLiveData: routeMocks.sanitizeBrandReportLiveData,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaignReport: {
      findFirst: routeMocks.campaignReportFindFirst,
    },
  },
}));

const report = {
  id: "report-1",
  campaignId: "campaign-1",
  periodStart: new Date("2026-05-01T00:00:00.000Z"),
  periodEnd: new Date("2026-05-31T00:00:00.000Z"),
  status: "FINAL",
  visibleToBrand: true,
};

const params = { params: Promise.resolve({ id: "report-1" }) };

describe("GET /api/brand/reports/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "brand-supabase-1", role: "brand" });
    routeMocks.getActiveBrandMembershipsForSupabaseId.mockResolvedValue({
      brandContacts: [{ brandId: "brand-1" }],
    });
    routeMocks.campaignReportFindFirst.mockResolvedValue(report);
    routeMocks.getCampaignReportLiveData.mockResolvedValue({ campaign: { id: "campaign-1" } });
    routeMocks.sanitizeBrandReportLiveData.mockReturnValue({ safe: true });
  });

  it("requires brand or admin auth", async () => {
    routeMocks.requireAuth.mockRejectedValueOnce(new Error("Forbidden"));

    const response = await GET(new Request("http://localhost/api/brand/reports/report-1"), params);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(routeMocks.campaignReportFindFirst).not.toHaveBeenCalled();
  });

  it("scopes brand users to final visible reports for their active brand memberships", async () => {
    const response = await GET(new Request("http://localhost/api/brand/reports/report-1"), params);

    expect(response.status).toBe(200);
    expect(routeMocks.campaignReportFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "report-1",
          brandId: { in: ["brand-1"] },
          brand: { portalEnabled: true },
          status: "FINAL",
          visibleToBrand: true,
        },
      }),
    );
    await expect(response.json()).resolves.toEqual({
      report: expect.objectContaining({ id: "report-1" }),
      liveData: { safe: true },
    });
  });

  it("blocks brand users without active brand memberships", async () => {
    routeMocks.getActiveBrandMembershipsForSupabaseId.mockResolvedValueOnce({ brandContacts: [] });

    const response = await GET(new Request("http://localhost/api/brand/reports/report-1"), params);

    expect(response.status).toBe(403);
    expect(routeMocks.campaignReportFindFirst).not.toHaveBeenCalled();
  });

  it("allows admins to preview final visible brand reports", async () => {
    routeMocks.requireAuth.mockResolvedValueOnce({ userId: "admin-supabase-1", role: "admin" });

    const response = await GET(new Request("http://localhost/api/brand/reports/report-1"), params);

    expect(response.status).toBe(200);
    expect(routeMocks.getActiveBrandMembershipsForSupabaseId).not.toHaveBeenCalled();
    expect(routeMocks.campaignReportFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "report-1",
          status: "FINAL",
          visibleToBrand: true,
          brand: { portalEnabled: true },
        },
      }),
    );
  });
});

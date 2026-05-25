import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const routeMocks = vi.hoisted(() => ({
  campaignFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
  attributionCreate: vi.fn(),
}));

vi.mock("nanoid", () => ({
  nanoid: () => "click-1",
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: { findFirst: routeMocks.campaignFindFirst },
    user: { findUnique: routeMocks.userFindUnique },
    campaignReferralAttribution: {
      create: routeMocks.attributionCreate,
    },
  },
}));

const params = {
  params: Promise.resolve({
    campaignSlug: "clipprofit",
    referralCode: "QUBGZDF-",
  }),
};

describe("GET /c/[campaignSlug]/[referralCode]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.campaignFindFirst.mockResolvedValue({
      id: "campaign-1",
      slug: "clipprofit",
      name: "ClipProfit",
    });
    routeMocks.userFindUnique.mockResolvedValue({
      id: "referrer-1",
      role: "creator",
    });
  });

  it("creates click attribution and redirects to signup", async () => {
    const response = await GET(
      new Request("https://app.test/c/clipprofit/QUBGZDF-"),
      params,
    );

    expect(routeMocks.attributionCreate).toHaveBeenCalledWith({
      data: {
        campaignId: "campaign-1",
        referrerId: "referrer-1",
        referralCode: "QUBGZDF-",
        clickId: "click-1",
      },
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.test/sign-up?ref=QUBGZDF-&campaign=clipprofit&click=click-1",
    );
  });

  it("falls back when the campaign or referrer is invalid", async () => {
    routeMocks.userFindUnique.mockResolvedValue(null);

    const response = await GET(
      new Request("https://app.test/c/clipprofit/QUBGZDF-"),
      params,
    );

    expect(routeMocks.attributionCreate).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://app.test/sign-up?campaign_error=invalid_link",
    );
  });
});

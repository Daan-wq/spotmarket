import { describe, expect, it } from "vitest";
import { toBrandPortalWorkflowBrand } from "./brand-portal-workflow";

describe("toBrandPortalWorkflowBrand", () => {
  it("counts only active and completed campaigns as automatically visible in the brand portal", () => {
    const brand = {
      id: "brand-1",
      name: "Brand One",
      contactEmail: "owner@example.com",
      portalEnabled: true,
      portalCreatedAt: new Date("2026-06-01T00:00:00.000Z"),
      contacts: [],
      campaigns: [
        { id: "active-1", status: "active" as const },
        { id: "completed-1", status: "completed" as const },
        { id: "draft-1", status: "draft" as const },
        { id: "paused-1", status: "paused" as const },
      ],
      _count: { campaigns: 4 },
    };

    expect(toBrandPortalWorkflowBrand(brand)).toEqual(
      expect.objectContaining({
        campaignsCount: 4,
        visibleCampaignsCount: 2,
        activeCampaignsCount: 1,
        completedCampaignsCount: 1,
      }),
    );
  });

  it("keeps eligible campaigns hidden until the portal is active", () => {
    const brand = {
      id: "brand-2",
      name: "Brand Two",
      contactEmail: null,
      portalEnabled: false,
      portalCreatedAt: null,
      contacts: [],
      campaigns: [
        { id: "active-1", status: "active" as const },
        { id: "completed-1", status: "completed" as const },
      ],
      _count: { campaigns: 2 },
    };

    expect(toBrandPortalWorkflowBrand(brand)).toEqual(
      expect.objectContaining({
        visibleCampaignsCount: 0,
        activeCampaignsCount: 1,
        completedCampaignsCount: 1,
      }),
    );
  });
});

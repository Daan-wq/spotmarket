import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  brandLeadFindUnique: vi.fn(),
  brandCreate: vi.fn(),
  brandOnboardingCreate: vi.fn(),
  brandLeadUpdate: vi.fn(),
  userFindFirst: vi.fn(),
  auditLogCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brandLead: {
      findUnique: routeMocks.brandLeadFindUnique,
    },
    $transaction: routeMocks.transaction,
  },
}));

const params = { params: Promise.resolve({ id: "lead-1" }) };

const lead = {
  id: "lead-1",
  brandName: "Merry in the Jungle",
  category: "Podcast",
  subcategory: "Starter package",
  contactName: "Merry",
  contactEmail: "merry@example.com",
  website: "merry.example",
  owner: "Solomon",
  estimatedValue: 1200,
  notes: "Ready to start",
  convertedBrandId: null,
};

describe("/api/admin/crm/leads/[id]/convert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-1" });
    routeMocks.brandLeadFindUnique.mockResolvedValue(lead);
    routeMocks.transaction.mockImplementation((callback) =>
      callback({
        brand: { create: routeMocks.brandCreate },
        brandOnboarding: { create: routeMocks.brandOnboardingCreate },
        brandLead: { update: routeMocks.brandLeadUpdate },
        user: { findFirst: routeMocks.userFindFirst },
        auditLog: { create: routeMocks.auditLogCreate },
      }),
    );
    routeMocks.brandCreate.mockResolvedValue({ id: "brand-1", name: "Merry in the Jungle" });
    routeMocks.brandOnboardingCreate.mockResolvedValue({ id: "onboarding-1", brandId: "brand-1" });
    routeMocks.brandLeadUpdate.mockResolvedValue({ ...lead, stage: "WON", convertedBrandId: "brand-1" });
    routeMocks.userFindFirst.mockResolvedValue({ id: "db-admin-1" });
    routeMocks.auditLogCreate.mockResolvedValue({});
  });

  it("creates a brand and onboarding record from lead defaults", async () => {
    const response = await POST(
      new Request("https://app.test/api/admin/crm/leads/lead-1/convert", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      params,
    );

    expect(response.status).toBe(201);
    expect(routeMocks.brandCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Merry in the Jungle",
        niche: "Podcast",
        website: "merry.example",
        contactName: "Merry",
        contactEmail: "merry@example.com",
        owner: "Solomon",
        status: "ONBOARDING",
        monthlyValue: 1200,
        currency: "EUR",
        notes: "Ready to start",
      }),
    });
    expect(routeMocks.brandOnboardingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        brandId: "brand-1",
        packageName: "Starter package",
        monthlyPrice: 1200,
        accountManager: "Solomon",
      }),
    });
    expect(routeMocks.brandLeadUpdate).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: { stage: "WON", convertedBrandId: "brand-1" },
    });
    expect(routeMocks.auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "db-admin-1",
        action: "crm.lead.convert",
        entityId: "lead-1",
        metadata: { brandId: "brand-1" },
      }),
    });
  });

  it("returns 404 when the lead is missing", async () => {
    routeMocks.brandLeadFindUnique.mockResolvedValue(null);

    const response = await POST(
      new Request("https://app.test/api/admin/crm/leads/missing/convert", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
    expect(routeMocks.brandCreate).not.toHaveBeenCalled();
  });
});

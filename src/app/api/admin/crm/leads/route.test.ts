import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  brandLeadFindMany: vi.fn(),
  brandLeadCreate: vi.fn(),
  leadGroupUpsert: vi.fn(),
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
      findMany: routeMocks.brandLeadFindMany,
      create: routeMocks.brandLeadCreate,
    },
    leadGroup: {
      upsert: routeMocks.leadGroupUpsert,
    },
    user: {
      findFirst: routeMocks.userFindFirst,
    },
    auditLog: {
      create: routeMocks.auditLogCreate,
    },
    $transaction: routeMocks.transaction,
  },
}));

const lead = {
  id: "lead-1",
  brandName: "Merry in the Jungle",
  category: "Podcast",
  subcategory: "Series",
  contactName: "Merry",
  contactEmail: "merry@example.com",
  contactPhone: null,
  contactLinkedIn: null,
  website: "merry.example",
  source: null,
  conversionBlocker: null,
  stage: "LEAD",
  priority: "MEDIUM",
  owner: "Solomon",
  nextAction: null,
  lastContactedAt: null,
  nextFollowUpAt: null,
  estimatedValue: 0,
  probability: 0,
  notes: "Same owner cluster",
  convertedBrandId: null,
  archivedAt: null,
  leadGroupId: null,
  leadGroup: null,
  createdAt: new Date("2026-05-29T10:00:00.000Z"),
  updatedAt: new Date("2026-05-29T10:00:00.000Z"),
};

describe("/api/admin/crm/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-1" });
    routeMocks.transaction.mockImplementation((callback) =>
      callback({
        brandLead: { create: routeMocks.brandLeadCreate },
        leadGroup: { upsert: routeMocks.leadGroupUpsert },
        user: { findFirst: routeMocks.userFindFirst },
        auditLog: { create: routeMocks.auditLogCreate },
      }),
    );
    routeMocks.userFindFirst.mockResolvedValue({ id: "db-admin-1" });
    routeMocks.auditLogCreate.mockResolvedValue({});
  });

  it("lists leads with their optional group", async () => {
    routeMocks.brandLeadFindMany.mockResolvedValue([lead]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(routeMocks.brandLeadFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { leadGroup: true },
      }),
    );
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: "lead-1",
        createdAt: "2026-05-29T10:00:00.000Z",
      }),
    ]);
  });

  it("creates a lead without a group", async () => {
    routeMocks.brandLeadCreate.mockResolvedValue(lead);

    const response = await POST(
      new Request("https://app.test/api/admin/crm/leads", {
        method: "POST",
        body: JSON.stringify({
          brandName: " Merry in the Jungle ",
          contactName: " Merry ",
          contactEmail: "",
          category: "Podcast",
          subcategory: "Series",
          conversionBlocker: "Wacht op reactie",
          nextAction: "Stuur case study",
          website: "merry.example",
          owner: "Solomon",
          notes: "Same owner cluster",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(routeMocks.leadGroupUpsert).not.toHaveBeenCalled();
    expect(routeMocks.brandLeadCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        brandName: "Merry in the Jungle",
        leadGroupId: undefined,
        contactEmail: undefined,
        category: "Podcast",
        subcategory: "Series",
        conversionBlocker: "Wacht op reactie",
        nextAction: "Stuur case study",
        estimatedValue: 0,
        probability: 0,
      }),
      include: { leadGroup: true },
    });
    expect(routeMocks.auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "db-admin-1",
        action: "crm.lead.create",
        entityType: "BrandLead",
        entityId: "lead-1",
        metadata: { brandName: "Merry in the Jungle", groupName: null },
      }),
    });
  });

  it("does not fail lead creation when the audit user is missing", async () => {
    routeMocks.userFindFirst.mockResolvedValue(null);
    routeMocks.brandLeadCreate.mockResolvedValue(lead);

    const response = await POST(
      new Request("https://app.test/api/admin/crm/leads", {
        method: "POST",
        body: JSON.stringify({ brandName: "No audit lead" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(routeMocks.auditLogCreate).not.toHaveBeenCalled();
  });

  it("creates or reuses a lead group from groupName", async () => {
    routeMocks.leadGroupUpsert.mockResolvedValue({ id: "group-1", name: "Solomon owner cluster", owner: "Solomon" });
    routeMocks.brandLeadCreate.mockResolvedValue({
      ...lead,
      leadGroupId: "group-1",
      leadGroup: { id: "group-1", name: "Solomon owner cluster", owner: "Solomon", notes: null },
    });

    const response = await POST(
      new Request("https://app.test/api/admin/crm/leads", {
        method: "POST",
        body: JSON.stringify({
          brandName: "Rookworst podcast",
          groupName: " Solomon owner cluster ",
          contactName: "Solomon",
          contactPhone: "+31 6 12345678",
          owner: "Solomon",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(routeMocks.leadGroupUpsert).toHaveBeenCalledWith({
      where: { name: "Solomon owner cluster" },
      update: {},
      create: { name: "Solomon owner cluster", owner: "Solomon" },
    });
    expect(routeMocks.brandLeadCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        brandName: "Rookworst podcast",
        leadGroupId: "group-1",
        contactName: "Solomon",
        contactPhone: "+31 6 12345678",
      }),
      include: { leadGroup: true },
    });
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        leadGroupId: "group-1",
        leadGroup: expect.objectContaining({ name: "Solomon owner cluster" }),
      }),
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  brandLeadFindUnique: vi.fn(),
  brandLeadUpdate: vi.fn(),
  leadGroupUpsert: vi.fn(),
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
      update: routeMocks.brandLeadUpdate,
    },
    leadGroup: {
      upsert: routeMocks.leadGroupUpsert,
    },
    auditLog: {
      create: routeMocks.auditLogCreate,
    },
    $transaction: routeMocks.transaction,
  },
}));

const params = { params: Promise.resolve({ id: "lead-1" }) };

const updatedLead = {
  id: "lead-1",
  brandName: "Merry in the Jungle",
  category: "Podcast",
  subcategory: "Series",
  contactName: "Merry",
  contactEmail: "merry@example.com",
  contactPhone: "+31 6 12345678",
  contactLinkedIn: null,
  website: "merry.example",
  source: null,
  stage: "LEAD",
  priority: "MEDIUM",
  owner: "Solomon",
  lastContactedAt: null,
  nextFollowUpAt: null,
  estimatedValue: 0,
  probability: 0,
  notes: "Same owner cluster",
  convertedBrandId: null,
  leadGroupId: "group-1",
  leadGroup: { id: "group-1", name: "Solomon owner cluster", owner: "Solomon", notes: null },
  createdAt: new Date("2026-05-29T10:00:00.000Z"),
  updatedAt: new Date("2026-05-29T11:00:00.000Z"),
};

describe("/api/admin/crm/leads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-1" });
    routeMocks.transaction.mockImplementation((callback) =>
      callback({
        brandLead: {
          findUnique: routeMocks.brandLeadFindUnique,
          update: routeMocks.brandLeadUpdate,
        },
        leadGroup: { upsert: routeMocks.leadGroupUpsert },
        auditLog: { create: routeMocks.auditLogCreate },
      }),
    );
    routeMocks.brandLeadFindUnique.mockResolvedValue({ id: "lead-1" });
    routeMocks.auditLogCreate.mockResolvedValue({});
  });

  it("updates a lead and reuses a group from groupName", async () => {
    routeMocks.leadGroupUpsert.mockResolvedValue({ id: "group-1", name: "Solomon owner cluster", owner: "Solomon" });
    routeMocks.brandLeadUpdate.mockResolvedValue(updatedLead);

    const response = await PATCH(
      new Request("https://app.test/api/admin/crm/leads/lead-1", {
        method: "PATCH",
        body: JSON.stringify({
          brandName: " Merry in the Jungle ",
          groupName: " Solomon owner cluster ",
          category: "Podcast",
          subcategory: "Series",
          contactName: "Merry",
          contactEmail: "merry@example.com",
          contactPhone: "+31 6 12345678",
          contactLinkedIn: "",
          website: "merry.example",
          owner: "Solomon",
          source: "",
          notes: "Same owner cluster",
        }),
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.leadGroupUpsert).toHaveBeenCalledWith({
      where: { name: "Solomon owner cluster" },
      update: {},
      create: { name: "Solomon owner cluster", owner: "Solomon" },
    });
    expect(routeMocks.brandLeadUpdate).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: expect.objectContaining({
        brandName: "Merry in the Jungle",
        leadGroupId: "group-1",
        contactLinkedIn: null,
        source: null,
      }),
      include: { leadGroup: true },
    });
    expect(routeMocks.auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "admin-1",
        action: "crm.lead.update",
        entityId: "lead-1",
        metadata: { brandName: "Merry in the Jungle", groupName: "Solomon owner cluster" },
      }),
    });
  });

  it("clears the group when groupName is blank", async () => {
    routeMocks.brandLeadUpdate.mockResolvedValue({ ...updatedLead, leadGroupId: null, leadGroup: null });

    const response = await PATCH(
      new Request("https://app.test/api/admin/crm/leads/lead-1", {
        method: "PATCH",
        body: JSON.stringify({
          brandName: "Merry in the Jungle",
          groupName: "",
        }),
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.leadGroupUpsert).not.toHaveBeenCalled();
    expect(routeMocks.brandLeadUpdate).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: expect.objectContaining({ leadGroupId: null }),
      include: { leadGroup: true },
    });
  });

  it("returns 404 when the lead does not exist", async () => {
    routeMocks.brandLeadFindUnique.mockResolvedValue(null);

    const response = await PATCH(
      new Request("https://app.test/api/admin/crm/leads/missing", {
        method: "PATCH",
        body: JSON.stringify({ brandName: "Missing lead" }),
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
    expect(routeMocks.brandLeadUpdate).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  brandLeadFindUnique: vi.fn(),
  brandLeadUpdate: vi.fn(),
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
      findUnique: routeMocks.brandLeadFindUnique,
      update: routeMocks.brandLeadUpdate,
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
  conversionBlocker: "Wacht op reactie",
  stage: "LEAD",
  priority: "MEDIUM",
  owner: "Solomon",
  nextAction: "Stuur case study",
  lastContactedAt: null,
  nextFollowUpAt: null,
  estimatedValue: 0,
  probability: 0,
  notes: "Same owner cluster",
  convertedBrandId: null,
  archivedAt: null,
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
        user: { findFirst: routeMocks.userFindFirst },
        auditLog: { create: routeMocks.auditLogCreate },
      }),
    );
    routeMocks.brandLeadFindUnique.mockResolvedValue({ id: "lead-1" });
    routeMocks.userFindFirst.mockResolvedValue({ id: "db-admin-1" });
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
        userId: "db-admin-1",
        action: "crm.lead.update",
        entityId: "lead-1",
        metadata: { brandName: "Merry in the Jungle", groupName: "Solomon owner cluster" },
      }),
    });
  });

  it("supports status-only partial updates", async () => {
    routeMocks.brandLeadUpdate.mockResolvedValue({ ...updatedLead, stage: "CONTACTED" });

    const response = await PATCH(
      new Request("https://app.test/api/admin/crm/leads/lead-1", {
        method: "PATCH",
        body: JSON.stringify({ stage: "CONTACTED" }),
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.brandLeadUpdate).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: { stage: "CONTACTED" },
      include: { leadGroup: true },
    });
  });

  it("stores blocker and next action updates", async () => {
    routeMocks.brandLeadUpdate.mockResolvedValue({
      ...updatedLead,
      conversionBlocker: "Budget/prijs",
      nextAction: "Nieuwe pricing sturen",
    });

    const response = await PATCH(
      new Request("https://app.test/api/admin/crm/leads/lead-1", {
        method: "PATCH",
        body: JSON.stringify({
          conversionBlocker: "Budget/prijs",
          nextAction: "Nieuwe pricing sturen",
        }),
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.brandLeadUpdate).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: {
        conversionBlocker: "Budget/prijs",
        nextAction: "Nieuwe pricing sturen",
      },
      include: { leadGroup: true },
    });
  });

  it("still saves the lead when the audit user cannot be resolved", async () => {
    routeMocks.userFindFirst.mockResolvedValue(null);
    routeMocks.brandLeadUpdate.mockResolvedValue(updatedLead);

    const response = await PATCH(
      new Request("https://app.test/api/admin/crm/leads/lead-1", {
        method: "PATCH",
        body: JSON.stringify({
          brandName: "Merry in the Jungle",
          groupName: "Solomon owner cluster",
        }),
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.brandLeadUpdate).toHaveBeenCalled();
    expect(routeMocks.auditLogCreate).not.toHaveBeenCalled();
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

  it("restores an archived lead when archivedAt is null", async () => {
    routeMocks.brandLeadUpdate.mockResolvedValue({ ...updatedLead, archivedAt: null });

    const response = await PATCH(
      new Request("https://app.test/api/admin/crm/leads/lead-1", {
        method: "PATCH",
        body: JSON.stringify({ archivedAt: null }),
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.brandLeadUpdate).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: { archivedAt: null },
      include: { leadGroup: true },
    });
  });

  it("soft archives a lead instead of deleting it", async () => {
    const archivedAt = new Date("2026-05-30T10:00:00.000Z");
    routeMocks.brandLeadUpdate.mockResolvedValue({ ...updatedLead, archivedAt });

    const response = await DELETE(
      new Request("https://app.test/api/admin/crm/leads/lead-1", { method: "DELETE" }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.brandLeadUpdate).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: { archivedAt: expect.any(Date) },
      include: { leadGroup: true },
    });
    expect(routeMocks.auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "crm.lead.archive",
        entityId: "lead-1",
      }),
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

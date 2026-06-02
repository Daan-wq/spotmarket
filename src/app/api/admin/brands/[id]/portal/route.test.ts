import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  brandFindUnique: vi.fn(),
  brandUpdate: vi.fn(),
  auditLogCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brand: {
      findUnique: routeMocks.brandFindUnique,
      update: routeMocks.brandUpdate,
    },
    auditLog: { create: routeMocks.auditLogCreate },
  },
}));

const brand = {
  id: "brand-1",
  name: "Bram's Fruit",
  contactEmail: "owner@bramsfruit.nl",
  portalEnabled: false,
  portalCreatedAt: null,
  portalCreatedBy: null,
};

describe("POST /api/admin/brands/[id]/portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-1" });
    routeMocks.brandFindUnique.mockResolvedValue(brand);
    routeMocks.brandUpdate.mockResolvedValue({
      ...brand,
      portalEnabled: true,
      portalCreatedAt: new Date("2026-06-02T15:00:00.000Z"),
      portalCreatedBy: "admin-1",
    });
    routeMocks.auditLogCreate.mockResolvedValue({});
  });

  it("requires admin auth", async () => {
    routeMocks.requireAuth.mockRejectedValueOnce(new Error("Unauthorized"));

    const response = await POST(new Request("http://localhost/api/admin/brands/brand-1/portal"), {
      params: Promise.resolve({ id: "brand-1" }),
    });

    expect(response.status).toBe(401);
    expect(routeMocks.brandUpdate).not.toHaveBeenCalled();
  });

  it("creates the brand portal and audits the action", async () => {
    const response = await POST(new Request("http://localhost/api/admin/brands/brand-1/portal"), {
      params: Promise.resolve({ id: "brand-1" }),
    });

    expect(response.status).toBe(200);
    expect(routeMocks.brandUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "brand-1" },
        data: expect.objectContaining({
          portalEnabled: true,
          portalCreatedAt: expect.any(Date),
          portalCreatedBy: "admin-1",
        }),
      }),
    );
    expect(routeMocks.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "brandPortal.create",
          entityId: "brand-1",
        }),
      }),
    );
  });

  it("is idempotent when the portal already exists", async () => {
    routeMocks.brandFindUnique.mockResolvedValueOnce({ ...brand, portalEnabled: true });
    routeMocks.brandUpdate.mockResolvedValueOnce({ ...brand, portalEnabled: true });

    const response = await POST(new Request("http://localhost/api/admin/brands/brand-1/portal"), {
      params: Promise.resolve({ id: "brand-1" }),
    });

    expect(response.status).toBe(200);
    expect(routeMocks.brandUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "brand-1" },
        data: {},
      }),
    );
    expect(routeMocks.auditLogCreate).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  brandFindUnique: vi.fn(),
  brandUpdate: vi.fn(),
  userFindUnique: vi.fn(),
  brandContactUpsert: vi.fn(),
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
    user: {
      findUnique: routeMocks.userFindUnique,
    },
    brandContact: {
      upsert: routeMocks.brandContactUpsert,
    },
    auditLog: { create: routeMocks.auditLogCreate },
  },
}));

const brand = {
  id: "brand-1",
  name: "ClipProfit",
  contactEmail: "info@daansoftware.nl",
  portalEnabled: true,
  portalCreatedAt: new Date("2026-06-02T12:00:00.000Z"),
  portalCreatedBy: "admin-supabase-1",
};

const activeContact = {
  id: "contact-1",
  brandId: "brand-1",
  userId: "admin-user-1",
  email: "info@daansoftware.nl",
  name: "Daan",
  status: "ACTIVE",
  inviteExpiresAt: null,
  invitedAt: new Date("2026-06-02T12:00:00.000Z"),
  acceptedAt: new Date("2026-06-02T12:00:00.000Z"),
  brand: { id: "brand-1", name: "ClipProfit" },
  user: { id: "admin-user-1", email: "info@daansoftware.nl", role: "admin" },
};

const invitedContact = {
  ...activeContact,
  id: "contact-2",
  userId: null,
  email: "client@example.com",
  name: "Client",
  status: "INVITED",
  inviteExpiresAt: new Date("2026-06-09T12:00:00.000Z"),
  acceptedAt: null,
  user: null,
};

describe("POST /api/admin/brands/[id]/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-supabase-1" });
    routeMocks.brandFindUnique.mockResolvedValue(brand);
    routeMocks.userFindUnique.mockResolvedValue({ id: "admin-user-1", role: "admin" });
    routeMocks.brandContactUpsert.mockResolvedValue(activeContact);
    routeMocks.auditLogCreate.mockResolvedValue({});
  });

  it("activates an existing admin as a /brand test contact without generating an invite", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/brands/brand-1/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "info@daansoftware.nl", name: "Daan" }),
      }),
      { params: Promise.resolve({ id: "brand-1" }) },
    );

    expect(response.status).toBe(201);
    expect(routeMocks.brandContactUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: "admin-user-1",
          status: "ACTIVE",
          inviteTokenHash: null,
          inviteExpiresAt: null,
          acceptedAt: expect.any(Date),
        }),
        update: expect.objectContaining({
          userId: "admin-user-1",
          status: "ACTIVE",
          inviteTokenHash: null,
          inviteExpiresAt: null,
          acceptedAt: expect.any(Date),
        }),
      }),
    );
    expect(routeMocks.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "brandContact.invite",
          metadata: expect.objectContaining({
            activatedExistingAdmin: true,
            emailSent: false,
          }),
        }),
      }),
    );
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        inviteUrl: null,
        emailSent: false,
        contact: expect.objectContaining({ status: "ACTIVE" }),
      }),
    );
  });

  it("returns an invite link without sending email for external brand contacts", async () => {
    routeMocks.userFindUnique.mockResolvedValueOnce(null);
    routeMocks.brandContactUpsert.mockResolvedValueOnce(invitedContact);

    const response = await POST(
      new Request("http://localhost/api/admin/brands/brand-1/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "client@example.com", name: "Client" }),
      }),
      { params: Promise.resolve({ id: "brand-1" }) },
    );

    expect(response.status).toBe(201);
    expect(routeMocks.brandContactUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          email: "client@example.com",
          status: "INVITED",
          inviteTokenHash: expect.any(String),
          inviteExpiresAt: expect.any(Date),
        }),
        update: expect.objectContaining({
          status: "INVITED",
          inviteTokenHash: expect.any(String),
          inviteExpiresAt: expect.any(Date),
        }),
      }),
    );
    expect(routeMocks.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            emailSent: false,
            activatedExistingAdmin: false,
          }),
        }),
      }),
    );
    const body = await response.json();
    expect(body.emailSent).toBe(false);
    expect(body.inviteUrl).toContain("/brand-invite/");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  brandFindUnique: vi.fn(),
  brandUpdate: vi.fn(),
  userFindUnique: vi.fn(),
  brandContactUpsert: vi.fn(),
  auditLogCreate: vi.fn(),
  resendSend: vi.fn(),
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

vi.mock("resend", () => ({
  Resend: vi.fn(function Resend() {
    return {
      emails: { send: routeMocks.resendSend },
    };
  }),
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

const savedEnv = {
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
  VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
};

describe("POST /api/admin/brands/[id]/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_BRANCH_URL;
    delete process.env.RESEND_API_KEY;
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-supabase-1" });
    routeMocks.brandFindUnique.mockResolvedValue(brand);
    routeMocks.userFindUnique.mockResolvedValue({ id: "admin-user-1", role: "admin" });
    routeMocks.brandContactUpsert.mockResolvedValue(activeContact);
    routeMocks.auditLogCreate.mockResolvedValue({});
    routeMocks.resendSend.mockResolvedValue({});
  });

  afterEach(() => {
    if (savedEnv.VERCEL_ENV === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = savedEnv.VERCEL_ENV;
    }
    if (savedEnv.VERCEL_URL === undefined) {
      delete process.env.VERCEL_URL;
    } else {
      process.env.VERCEL_URL = savedEnv.VERCEL_URL;
    }
    if (savedEnv.VERCEL_BRANCH_URL === undefined) {
      delete process.env.VERCEL_BRANCH_URL;
    } else {
      process.env.VERCEL_BRANCH_URL = savedEnv.VERCEL_BRANCH_URL;
    }
    if (savedEnv.RESEND_API_KEY === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = savedEnv.RESEND_API_KEY;
    }
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
    expect(routeMocks.resendSend).not.toHaveBeenCalled();
  });

  it("sends a professional invite email when Resend is configured", async () => {
    process.env.RESEND_API_KEY = "test-resend-key";
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
    expect(routeMocks.resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "ClipProfit <noreply@clipprofit.com>",
        to: "client@example.com",
        subject: "Je ClipProfit rapportomgeving voor ClipProfit",
        html: expect.stringContaining("Account activeren"),
      }),
    );
    const body = await response.json();
    expect(body.emailSent).toBe(true);
    expect(body.inviteUrl).toContain("/brand-invite/");
  });

  it("keeps the invite link when Resend fails", async () => {
    process.env.RESEND_API_KEY = "test-resend-key";
    routeMocks.resendSend.mockRejectedValueOnce(new Error("Resend unavailable"));
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
    expect(routeMocks.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            emailSent: false,
            emailError: "Resend unavailable",
          }),
        }),
      }),
    );
    const body = await response.json();
    expect(body.emailSent).toBe(false);
    expect(body.inviteUrl).toContain("/brand-invite/");
  });

  it("uses the current Vercel preview URL for invite links instead of stale request hosts", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "clipprofit-current.vercel.app";
    routeMocks.userFindUnique.mockResolvedValueOnce(null);
    routeMocks.brandContactUpsert.mockResolvedValueOnce(invitedContact);

    const response = await POST(
      new Request("https://clipprofit-old.vercel.app/api/admin/brands/brand-1/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "client@example.com", name: "Client" }),
      }),
      { params: Promise.resolve({ id: "brand-1" }) },
    );

    const body = await response.json();
    expect(body.inviteUrl).toMatch(/^https:\/\/clipprofit-current\.vercel\.app\/brand-invite\//);
    expect(body.emailSent).toBe(false);
  });
});

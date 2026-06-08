import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  userFindUnique: vi.fn(),
  incidentFindUnique: vi.fn(),
  dismissalUpsert: vi.fn(),
  dismissalDeleteMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    connectionHealthIncident: { findUnique: mocks.incidentFindUnique },
    connectionHealthDismissal: {
      upsert: mocks.dismissalUpsert,
      deleteMany: mocks.dismissalDeleteMany,
    },
  },
}));

import { PATCH } from "./route";

function request(dismissed: unknown) {
  return new Request("https://app.test/api/connection-health/incident-1/dismiss", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dismissed }),
  });
}

const context = {
  params: Promise.resolve({ incidentId: "incident-1" }),
};

describe("PATCH /api/connection-health/[incidentId]/dismiss", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      userId: "supabase-1",
      role: "creator",
    });
    mocks.userFindUnique.mockResolvedValue({ id: "user-1" });
    mocks.incidentFindUnique.mockResolvedValue({
      id: "incident-1",
      creatorProfile: { userId: "user-1" },
    });
    mocks.dismissalUpsert.mockResolvedValue({});
    mocks.dismissalDeleteMany.mockResolvedValue({ count: 1 });
  });

  it("persists a creator dismissal for their own incident", async () => {
    const response = await PATCH(request(true), context);

    expect(response.status).toBe(200);
    expect(mocks.dismissalUpsert).toHaveBeenCalledWith({
      where: {
        incidentId_viewerId: {
          incidentId: "incident-1",
          viewerId: "user-1",
        },
      },
      create: {
        incidentId: "incident-1",
        viewerId: "user-1",
      },
      update: {
        dismissedAt: expect.any(Date),
      },
    });
    await expect(response.json()).resolves.toEqual({ dismissed: true });
  });

  it("prevents a creator from dismissing another creator's incident", async () => {
    mocks.incidentFindUnique.mockResolvedValue({
      id: "incident-1",
      creatorProfile: { userId: "other-user" },
    });

    const response = await PATCH(request(true), context);

    expect(response.status).toBe(403);
    expect(mocks.dismissalUpsert).not.toHaveBeenCalled();
  });

  it("allows admins to remove their own dismissal", async () => {
    mocks.requireAuth.mockResolvedValue({
      userId: "admin-supabase",
      role: "admin",
    });
    mocks.userFindUnique.mockResolvedValue({ id: "admin-1" });

    const response = await PATCH(request(false), context);

    expect(response.status).toBe(200);
    expect(mocks.dismissalDeleteMany).toHaveBeenCalledWith({
      where: {
        incidentId: "incident-1",
        viewerId: "admin-1",
      },
    });
    await expect(response.json()).resolves.toEqual({ dismissed: false });
  });

  it("rejects invalid input", async () => {
    const response = await PATCH(request("yes"), context);

    expect(response.status).toBe(400);
    expect(mocks.incidentFindUnique).not.toHaveBeenCalled();
  });
});

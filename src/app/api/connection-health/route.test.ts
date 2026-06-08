import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  userFindUnique: vi.fn(),
  getAlerts: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
  },
}));

vi.mock("@/lib/connection-health", () => ({
  getConnectionHealthAlertsForViewer: mocks.getAlerts,
}));

import { GET } from "./route";

describe("GET /api/connection-health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      userId: "supabase-1",
      role: "creator",
    });
    mocks.userFindUnique.mockResolvedValue({ id: "user-1" });
    mocks.getAlerts.mockResolvedValue([{ id: "incident-1" }]);
  });

  it("returns role-scoped active incidents", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.requireAuth).toHaveBeenCalledWith("creator", "admin");
    expect(mocks.getAlerts).toHaveBeenCalledWith({
      id: "user-1",
      role: "creator",
    });
    await expect(response.json()).resolves.toEqual({
      incidents: [{ id: "incident-1" }],
    });
  });

  it("returns 401 for unauthenticated requests", async () => {
    mocks.requireAuth.mockRejectedValue(new Error("Unauthorized"));

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.getAlerts).not.toHaveBeenCalled();
  });
});

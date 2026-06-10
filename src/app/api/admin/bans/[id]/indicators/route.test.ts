import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  adminFindUnique: vi.fn(),
  banFindUnique: vi.fn(),
  signalFindFirst: vi.fn(),
  indicatorFindFirst: vi.fn(),
  indicatorCreate: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAuth: routeMocks.requireAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: routeMocks.adminFindUnique },
    accountBan: { findUnique: routeMocks.banFindUnique },
    accessSignal: { findFirst: routeMocks.signalFindFirst },
    banIndicator: {
      findFirst: routeMocks.indicatorFindFirst,
      create: routeMocks.indicatorCreate,
    },
  },
}));
vi.mock("@/lib/audit-log", () => ({ logAudit: routeMocks.logAudit }));

function request(body: unknown) {
  return new Request("https://app.test/api/admin/bans/ban-1/indicators", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/bans/:id/indicators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({
      userId: "admin-supabase",
      role: "admin",
    });
    routeMocks.adminFindUnique.mockResolvedValue({ id: "admin-1" });
    routeMocks.banFindUnique.mockResolvedValue({
      id: "ban-1",
      liftedAt: null,
      user: { id: "creator-1", supabaseId: "creator-supabase" },
    });
    routeMocks.signalFindFirst.mockResolvedValue({
      id: "signal-1",
      type: "DEVICE",
      valueHash: "v1:device",
      maskedValue: "devi...1234",
    });
    routeMocks.indicatorFindFirst.mockResolvedValue(null);
    routeMocks.indicatorCreate.mockResolvedValue({
      id: "indicator-1",
      type: "DEVICE",
      strength: "STRONG",
      mode: "LAYERED",
      maskedValue: "devi...1234",
    });
    routeMocks.logAudit.mockResolvedValue(undefined);
  });

  it("activates a selected device signal as a strong layered indicator", async () => {
    const response = await POST(
      request({ accessSignalId: "signal-1", mode: "LAYERED" }),
      { params: Promise.resolve({ id: "ban-1" }) },
    );

    expect(response.status).toBe(201);
    expect(routeMocks.indicatorCreate).toHaveBeenCalledWith({
      data: {
        accountBanId: "ban-1",
        type: "DEVICE",
        valueHash: "v1:device",
        maskedValue: "devi...1234",
        strength: "STRONG",
        mode: "LAYERED",
        reason: null,
        createdByUserId: "admin-1",
      },
      select: {
        id: true,
        type: true,
        strength: true,
        mode: true,
        maskedValue: true,
        createdAt: true,
      },
    });
  });

  it("rejects a hard IP override without explicit risk acknowledgement", async () => {
    routeMocks.signalFindFirst.mockResolvedValue({
      id: "signal-ip",
      type: "IP",
      valueHash: "v1:ip",
      maskedValue: "203.0.113.xxx",
    });

    const response = await POST(
      request({
        accessSignalId: "signal-ip",
        mode: "HARD",
        reason: "Viewbot source",
      }),
      { params: Promise.resolve({ id: "ban-1" }) },
    );

    expect(response.status).toBe(400);
    expect(routeMocks.indicatorCreate).not.toHaveBeenCalled();
  });

  it("allows a warned and motivated hard IP override", async () => {
    routeMocks.signalFindFirst.mockResolvedValue({
      id: "signal-ip",
      type: "IP",
      valueHash: "v1:ip",
      maskedValue: "203.0.113.xxx",
    });
    routeMocks.indicatorCreate.mockResolvedValue({
      id: "indicator-ip",
      type: "IP",
      strength: "WEAK",
      mode: "HARD",
      maskedValue: "203.0.113.xxx",
    });

    const response = await POST(
      request({
        accessSignalId: "signal-ip",
        mode: "HARD",
        acknowledgeSharedIpRisk: true,
        reason: "Confirmed dedicated viewbot endpoint",
      }),
      { params: Promise.resolve({ id: "ban-1" }) },
    );

    expect(response.status).toBe(201);
    expect(routeMocks.indicatorCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "IP",
          strength: "WEAK",
          mode: "HARD",
          reason: "Confirmed dedicated viewbot endpoint",
        }),
      }),
    );
  });
});

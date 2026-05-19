import { beforeEach, describe, expect, test, vi } from "vitest";
import { PATCH } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: routeMocks.userUpdate,
    },
  },
}));

function request(body: unknown) {
  return new Request("https://app.test/api/settings/connect-warning-preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/settings/connect-warning-preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "creator-supabase-1" });
    routeMocks.userUpdate.mockResolvedValue({
      dismissedFacebookPageWarning: false,
      dismissedInstagramProfessionalWarning: false,
    });
  });

  test("rejects unauthorized requests", async () => {
    routeMocks.requireAuth.mockRejectedValue(new Error("Unauthorized"));

    const response = await PATCH(request({ platform: "FACEBOOK", dismissed: true }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(routeMocks.userUpdate).not.toHaveBeenCalled();
  });

  test("rejects invalid platform values", async () => {
    const response = await PATCH(request({ platform: "YOUTUBE", dismissed: true }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid input" });
    expect(routeMocks.userUpdate).not.toHaveBeenCalled();
  });

  test("updates the Facebook page warning preference", async () => {
    routeMocks.userUpdate.mockResolvedValue({
      dismissedFacebookPageWarning: true,
      dismissedInstagramProfessionalWarning: false,
    });

    const response = await PATCH(request({ platform: "FACEBOOK", dismissed: true }));

    expect(response.status).toBe(200);
    expect(routeMocks.requireAuth).toHaveBeenCalledWith("creator");
    expect(routeMocks.userUpdate).toHaveBeenCalledWith({
      where: { supabaseId: "creator-supabase-1" },
      data: { dismissedFacebookPageWarning: true },
      select: {
        dismissedFacebookPageWarning: true,
        dismissedInstagramProfessionalWarning: true,
      },
    });
    await expect(response.json()).resolves.toEqual({
      preferences: { facebookPage: true, instagramProfessional: false },
    });
  });

  test("updates the Instagram professional warning preference", async () => {
    routeMocks.userUpdate.mockResolvedValue({
      dismissedFacebookPageWarning: false,
      dismissedInstagramProfessionalWarning: true,
    });

    const response = await PATCH(request({ platform: "INSTAGRAM", dismissed: true }));

    expect(response.status).toBe(200);
    expect(routeMocks.userUpdate).toHaveBeenCalledWith({
      where: { supabaseId: "creator-supabase-1" },
      data: { dismissedInstagramProfessionalWarning: true },
      select: {
        dismissedFacebookPageWarning: true,
        dismissedInstagramProfessionalWarning: true,
      },
    });
    await expect(response.json()).resolves.toEqual({
      preferences: { facebookPage: false, instagramProfessional: true },
    });
  });
});

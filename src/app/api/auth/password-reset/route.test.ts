import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  generateLink: vi.fn(),
  sendAuthEmail: vi.fn(),
  rateLimit: vi.fn(),
  getClientIp: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        generateLink: routeMocks.generateLink,
      },
    },
  })),
}));

vi.mock("@/lib/auth-email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-email")>();
  return {
    ...actual,
    sendAuthEmail: routeMocks.sendAuthEmail,
  };
});

vi.mock("@/lib/rate-limit", () => ({
  AUTH_LIMIT: { maxRequests: 10, windowSec: 900 },
  rateLimit: routeMocks.rateLimit,
  getClientIp: routeMocks.getClientIp,
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    const values: Record<string, string> = {
      invalidInput: "Invalid input",
      rateLimited: "Too many requests",
      passwordResetFailed: "Could not send reset email",
    };
    return values[key] ?? key;
  }),
}));

function passwordResetRequest(
  email: unknown,
  url = "https://app.clipprofit.com/api/auth/password-reset",
) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.10",
    },
    body: JSON.stringify({ email }),
  });
}

describe("POST /api/auth/password-reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.getClientIp.mockReturnValue("203.0.113.10");
    routeMocks.rateLimit.mockReturnValue({
      success: true,
      headers: {
        "X-RateLimit-Limit": "10",
        "X-RateLimit-Remaining": "9",
      },
    });
    routeMocks.generateLink.mockResolvedValue({
      data: {
        properties: {
          hashed_token: "recovery-token",
        },
      },
      error: null,
    });
    routeMocks.sendAuthEmail.mockResolvedValue(undefined);
  });

  it("rejects invalid email input before calling providers", async () => {
    const response = await POST(passwordResetRequest("not-an-email"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid input" });
    expect(routeMocks.generateLink).not.toHaveBeenCalled();
    expect(routeMocks.sendAuthEmail).not.toHaveBeenCalled();
  });

  it("applies the auth IP rate limit", async () => {
    routeMocks.rateLimit.mockReturnValueOnce({
      success: false,
      headers: {
        "X-RateLimit-Limit": "10",
        "X-RateLimit-Remaining": "0",
        "Retry-After": "120",
      },
    });

    const response = await POST(passwordResetRequest("Creator@Example.com"));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(routeMocks.rateLimit).toHaveBeenCalledWith(
      "password_reset_203.0.113.10",
      { maxRequests: 10, windowSec: 900 },
    );
    expect(routeMocks.generateLink).not.toHaveBeenCalled();
  });

  it("generates a recovery token and sends an English ClipProfit reset link", async () => {
    const response = await POST(passwordResetRequest("Creator@Example.com"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(routeMocks.generateLink).toHaveBeenCalledWith({
      type: "recovery",
      email: "creator@example.com",
      options: {
        redirectTo: "https://app.clipprofit.com/reset-password",
      },
    });
    expect(routeMocks.sendAuthEmail).toHaveBeenCalledWith({
      kind: "passwordRecovery",
      locale: "en",
      actionUrl:
        "https://app.clipprofit.com/auth/recovery?token_hash=recovery-token",
      to: "creator@example.com",
    });
  });

  it("uses Dutch copy and the Dutch request origin", async () => {
    await POST(
      passwordResetRequest(
        "creator@example.com",
        "https://app.clipprofit.nl/api/auth/password-reset",
      ),
    );

    expect(routeMocks.sendAuthEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "nl",
        actionUrl:
          "https://app.clipprofit.nl/auth/recovery?token_hash=recovery-token",
      }),
    );
  });

  it("returns the same success response when the account does not exist", async () => {
    routeMocks.generateLink.mockResolvedValueOnce({
      data: { properties: null },
      error: {
        code: "user_not_found",
        message: "User not found",
        status: 404,
      },
    });

    const response = await POST(passwordResetRequest("unknown@example.com"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(routeMocks.sendAuthEmail).not.toHaveBeenCalled();
  });

  it("returns a generic provider failure without exposing Supabase details", async () => {
    routeMocks.generateLink.mockResolvedValueOnce({
      data: { properties: null },
      error: {
        code: "unexpected_failure",
        message: "internal Supabase detail",
        status: 500,
      },
    });

    const response = await POST(passwordResetRequest("creator@example.com"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Could not send reset email",
    });
  });
});

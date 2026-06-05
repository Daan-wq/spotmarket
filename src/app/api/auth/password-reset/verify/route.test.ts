import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      verifyOtp: routeMocks.verifyOtp,
    },
  })),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    const values: Record<string, string> = {
      invalidInput: "Invalid input",
      recoveryFailed: "Invalid or expired recovery link",
    };
    return values[key] ?? key;
  }),
}));

function verifyRequest(tokenHash: unknown) {
  return new Request(
    "https://app.clipprofit.com/api/auth/password-reset/verify",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-locale": "en",
      },
      body: JSON.stringify({ tokenHash }),
    },
  );
}

describe("POST /api/auth/password-reset/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.verifyOtp.mockResolvedValue({
      data: { session: { access_token: "access-token" } },
      error: null,
    });
  });

  it("rejects malformed token input", async () => {
    const response = await POST(verifyRequest(""));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid input" });
    expect(routeMocks.verifyOtp).not.toHaveBeenCalled();
  });

  it("verifies a recovery token only after the user submits the form", async () => {
    const response = await POST(verifyRequest("recovery-token"));

    expect(routeMocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: "recovery-token",
      type: "recovery",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });

  it("returns a safe error for expired recovery tokens", async () => {
    routeMocks.verifyOtp.mockResolvedValueOnce({
      data: { session: null },
      error: { message: "Token expired" },
    });

    const response = await POST(verifyRequest("expired-token"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid or expired recovery link",
    });
  });
});

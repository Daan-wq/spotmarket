import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_EMAIL_FROM,
  getAuthEmailLocale,
  renderAuthEmail,
  sendAuthEmail,
} from "./index";

const emailMocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: emailMocks.send };
  },
}));

describe("auth email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "test-key";
    emailMocks.send.mockResolvedValue({
      data: { id: "email-1" },
      error: null,
    });
  });

  it("uses English for .com and Dutch for .nl auth requests", () => {
    expect(
      getAuthEmailLocale(
        new Request("https://app.clipprofit.com/api/auth/password-reset"),
      ),
    ).toBe("en");
    expect(
      getAuthEmailLocale(
        new Request("https://app.clipprofit.nl/api/auth/password-reset"),
      ),
    ).toBe("nl");
  });

  it("uses the forwarded locale for preview hosts", () => {
    expect(
      getAuthEmailLocale(
        new Request("https://preview.vercel.app/api/auth/password-reset", {
          headers: { "x-locale": "en" },
        }),
      ),
    ).toBe("en");
  });

  it("renders a branded English recovery email with only the supplied ClipProfit link", () => {
    const html = renderAuthEmail({
      kind: "passwordRecovery",
      locale: "en",
      actionUrl:
        "https://app.clipprofit.com/auth/recovery?token_hash=recovery-token",
    });

    expect(html).toContain("ClipProfit");
    expect(html).toContain("Reset your password");
    expect(html).toContain("Reset password");
    expect(html).toContain("#5d5fef");
    expect(html).toContain(
      "https://app.clipprofit.com/auth/recovery?token_hash=recovery-token",
    );
    expect(html).not.toContain("supabase.co");
  });

  it("renders localized verification copy and escapes interpolated URLs", () => {
    const html = renderAuthEmail({
      kind: "verification",
      locale: "nl",
      actionUrl:
        'https://app.clipprofit.nl/auth/confirm?ticket=<unsafe>&next="quoted"',
    });

    expect(html).toContain("Bevestig je account");
    expect(html).toContain("Bevestig mijn account");
    expect(html).toContain("&lt;unsafe&gt;");
    expect(html).toContain("&amp;next=&quot;quoted&quot;");
    expect(html).not.toContain("<unsafe>");
  });

  it("sends every auth email from noreply@clipprofit.com", async () => {
    await sendAuthEmail({
      kind: "verification",
      locale: "en",
      actionUrl: "https://app.clipprofit.com/auth/confirm?ticket=ticket-1",
      to: "creator@example.com",
    });

    expect(AUTH_EMAIL_FROM).toBe("ClipProfit <noreply@clipprofit.com>");
    expect(emailMocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: AUTH_EMAIL_FROM,
        to: "creator@example.com",
        subject: "Confirm your ClipProfit account",
        html: expect.stringContaining("Confirm my account"),
        text: expect.stringContaining(
          "https://app.clipprofit.com/auth/confirm?ticket=ticket-1",
        ),
      }),
    );
  });

  it("surfaces Resend delivery failures", async () => {
    emailMocks.send.mockResolvedValueOnce({
      data: null,
      error: { message: "domain rejected" },
    });

    await expect(
      sendAuthEmail({
        kind: "passwordRecovery",
        locale: "en",
        actionUrl:
          "https://app.clipprofit.com/auth/recovery?token_hash=recovery-token",
        to: "creator@example.com",
      }),
    ).rejects.toThrow("domain rejected");
  });
});

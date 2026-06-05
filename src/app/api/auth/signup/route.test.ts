import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  recentTicket: vi.fn(),
  createTicket: vi.fn(),
  attributionUpdateMany: vi.fn(),
  createUser: vi.fn(),
  sendAuthEmail: vi.fn(),
  resendSend: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    signupTicket: {
      findFirst: routeMocks.recentTicket,
      create: routeMocks.createTicket,
    },
    campaignReferralAttribution: {
      updateMany: routeMocks.attributionUpdateMany,
    },
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        createUser: routeMocks.createUser,
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

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: routeMocks.resendSend };
  },
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async ({ namespace }: { namespace: string }) => {
    if (namespace === "auth.api") {
      return (key: string) => key;
    }

    const values: Record<string, string> = {
      subject: "legacy subject",
      title: "legacy title",
      body: "legacy body",
      button: "legacy button",
      footer: "legacy footer",
    };
    return (key: string) => values[key] ?? key;
  }),
}));

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.recentTicket.mockResolvedValue(null);
    routeMocks.createUser.mockResolvedValue({
      data: { user: { id: "supabase-user-1" } },
      error: null,
    });
    routeMocks.createTicket.mockResolvedValue({
      id: "ticket-1",
      email: "creator@example.com",
    });
    routeMocks.attributionUpdateMany.mockResolvedValue({ count: 0 });
    routeMocks.sendAuthEmail.mockResolvedValue(undefined);
    routeMocks.resendSend.mockResolvedValue({
      data: { id: "legacy-email" },
      error: null,
    });
  });

  it("sends signup verification through the shared English auth email flow", async () => {
    const response = await POST(
      new Request("https://app.clipprofit.com/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "Creator@Example.com",
          password: "secret123",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.sendAuthEmail).toHaveBeenCalledWith({
      kind: "verification",
      locale: "en",
      actionUrl:
        "https://app.clipprofit.com/auth/confirm?ticket=ticket-1",
      to: "creator@example.com",
    });
    expect(routeMocks.resendSend).not.toHaveBeenCalled();
  });
});

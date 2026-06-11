import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  signInWithPassword: vi.fn(),
  cookiesSeenBySupabase: [] as Array<{ name: string; value: string }>,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: routeMocks.createServerClient,
}));

function request(
  body: Record<string, unknown>,
  cookie = "sb-test-ref-auth-token.0=stale-session",
) {
  return new NextRequest(
    "https://app.clipprofit.com/api/auth/password-sign-in",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify(body),
    },
  );
}

describe("POST /api/auth/password-sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.cookiesSeenBySupabase = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-ref.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    routeMocks.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: "paperclip-user" },
        session: { access_token: "new-access-token" },
      },
      error: null,
    });
    routeMocks.createServerClient.mockImplementation(
      (
        _url: string,
        _key: string,
        options: {
          cookies: {
            getAll: () => Array<{ name: string; value: string }>;
            setAll: (
              cookies: Array<{
                name: string;
                value: string;
                options?: Record<string, unknown>;
              }>,
            ) => void;
          };
        },
      ) => {
        routeMocks.cookiesSeenBySupabase = options.cookies.getAll();
        return {
          auth: {
            signInWithPassword: async (credentials: {
              email: string;
              password: string;
            }) => {
              const result = await routeMocks.signInWithPassword(credentials);
              if (!result.error) {
                options.cookies.setAll([
                  {
                    name: "sb-test-ref-auth-token",
                    value: "fresh-session",
                    options: { httpOnly: true, path: "/" },
                  },
                ]);
              }
              return result;
            },
          },
        };
      },
    );
  });

  it("replaces an invalid refresh cookie and always completes a valid Paperclip login on /brand", async () => {
    const response = await POST(
      request({
        identifier: "Paperclip",
        password: "valid-paperclip-password",
        redirectUrl: "/brand",
        attemptId: "6ec963c1-68cb-464d-a5df-dae80e720129",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      redirectUrl: "/brand",
    });
    expect(routeMocks.cookiesSeenBySupabase).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "sb-test-ref-auth-token.0" }),
      ]),
    );
    expect(routeMocks.signInWithPassword).toHaveBeenCalledWith({
      email: "paperclip@login.clipprofit.com",
      password: "valid-paperclip-password",
    });

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("sb-test-ref-auth-token.0=");
    expect(setCookie).toContain("fresh-session");
    expect(setCookie).toContain(
      "clipprofit-auth-attempt=6ec963c1-68cb-464d-a5df-dae80e720129",
    );
  });

  it("returns a specific Dutch error for invalid credentials", async () => {
    routeMocks.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        code: "invalid_credentials",
        message: "Invalid login credentials",
      },
    });

    const response = await POST(
      request({
        identifier: "Paperclip",
        password: "wrong-password",
        redirectUrl: "/brand",
        attemptId: "fdbbf45f-f836-4d62-8478-ab8db0af9fb4",
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      code: "INVALID_CREDENTIALS",
      error: "Gebruikersnaam of wachtwoord is onjuist.",
    });
  });

  it("returns a specific Dutch error when the auth network is unavailable", async () => {
    routeMocks.signInWithPassword.mockRejectedValue(
      new TypeError("fetch failed"),
    );

    const response = await POST(
      request({
        identifier: "Paperclip",
        password: "valid-paperclip-password",
        redirectUrl: "/brand",
        attemptId: "b993535a-8710-4307-bf8a-7e760fbab2b8",
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      code: "AUTH_NETWORK_ERROR",
      error:
        "Inloggen is tijdelijk niet bereikbaar. Controleer je verbinding en probeer het opnieuw.",
    });
  });

  it("never writes the identifier or password to diagnostic logs", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await POST(
      request({
        identifier: "Paperclip",
        password: "do-not-log-this-password",
        redirectUrl: "/brand",
        attemptId: "0caf0849-f5c3-4b5b-8a5a-2146bca76bfb",
      }),
    );

    const logs = JSON.stringify([...info.mock.calls, ...warn.mock.calls]);
    expect(logs).not.toContain("Paperclip");
    expect(logs).not.toContain("do-not-log-this-password");

    info.mockRestore();
    warn.mockRestore();
  });
});

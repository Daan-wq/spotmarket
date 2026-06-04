import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { LOCALE_COOKIE_MAX_AGE, LOCALE_COOKIE_NAME } from "@/i18n/routing";
import { updateAdminLocale } from "./actions";

const actionMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  revalidatePath: vi.fn(),
  cookies: vi.fn(),
  cookieSet: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: actionMocks.revalidatePath,
}));

vi.mock("next/headers", () => ({
  cookies: actionMocks.cookies,
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: actionMocks.requireAuth,
}));

describe("updateAdminLocale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionMocks.requireAuth.mockResolvedValue({ userId: "admin-supabase-1", role: "admin" });
    actionMocks.cookies.mockResolvedValue({ set: actionMocks.cookieSet });
  });

  test("requires admin auth before updating the locale", async () => {
    await expect(updateAdminLocale("en")).resolves.toEqual({ ok: true });

    expect(actionMocks.requireAuth).toHaveBeenCalledWith("admin");
  });

  test("rejects unsupported locales", async () => {
    await expect(updateAdminLocale("fr" as Locale)).resolves.toEqual({
      ok: false,
      error: "Unsupported language.",
    });

    expect(actionMocks.cookieSet).not.toHaveBeenCalled();
    expect(actionMocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("writes the locale cookie and revalidates admin pages", async () => {
    await expect(updateAdminLocale("en")).resolves.toEqual({ ok: true });

    expect(actionMocks.cookieSet).toHaveBeenCalledWith(LOCALE_COOKIE_NAME, "en", {
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
      path: "/",
    });
    expect(actionMocks.revalidatePath).toHaveBeenCalledWith("/admin");
    expect(actionMocks.revalidatePath).toHaveBeenCalledWith("/admin/settings");
  });
});

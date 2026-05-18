import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { OAuthButtons } from "./oauth-buttons";

vi.mock("next-intl", () => ({
  useTranslations: () => (
    key: string,
    values?: { provider?: string },
  ) => {
    if (key === "redirecting") return "Redirecting...";
    if (key === "signInWith") return `Sign in with ${values?.provider}`;
    if (key === "signUpWith") return `Sign up with ${values?.provider}`;
    return key;
  },
}));

describe("OAuthButtons", () => {
  test("can render only Discord as the primary auth method", () => {
    const html = renderToStaticMarkup(
      <OAuthButtons mode="signin" providers={["discord"]} />,
    );

    expect(html).toContain("Sign in with Discord");
    expect(html).not.toContain("Sign in with Google");
  });

  test("can render only Google as a fallback auth method", () => {
    const html = renderToStaticMarkup(
      <OAuthButtons mode="signup" providers={["google"]} />,
    );

    expect(html).toContain("Sign up with Google");
    expect(html).not.toContain("Sign up with Discord");
  });
});

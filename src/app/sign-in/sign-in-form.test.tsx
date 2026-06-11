import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInForm } from "./sign-in-form";

const navigationMocks = vi.hoisted(() => ({
  redirectUrl: "/",
  sessionExpired: false,
  authError: null as string | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => {
    const params = new URLSearchParams({
      redirect_url: navigationMocks.redirectUrl,
    });
    if (navigationMocks.sessionExpired) {
      params.set("session_expired", "1");
    }
    if (navigationMocks.authError) {
      params.set("auth_error", navigationMocks.authError);
    }
    return params;
  },
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/auth/oauth-buttons", () => ({
  OAuthButtons: ({ providers }: { providers: string[] }) => (
    <div>{providers.join(",")}</div>
  ),
  OAuthDivider: () => <div>divider</div>,
}));

describe("SignInForm", () => {
  beforeEach(() => {
    navigationMocks.redirectUrl = "/";
    navigationMocks.sessionExpired = false;
    navigationMocks.authError = null;
  });

  it("shows username and password immediately for a brand login", () => {
    navigationMocks.redirectUrl = "/brand";

    const html = renderToStaticMarkup(<SignInForm />);

    expect(html).toContain('id="sign-in-email"');
    expect(html).toContain('id="sign-in-password"');
    expect(html).not.toContain("signInOther");
  });

  it("shows a Dutch expired-session message when the proxy recovered the session", () => {
    navigationMocks.redirectUrl = "/brand";
    navigationMocks.sessionExpired = true;

    const html = renderToStaticMarkup(<SignInForm />);

    expect(html).toContain(
      "Je sessie was verlopen. Log opnieuw in met je gebruikersnaam en wachtwoord.",
    );
  });

  it("shows a Dutch network message after an auth service interruption", () => {
    navigationMocks.redirectUrl = "/brand";
    navigationMocks.authError = "network";

    const html = renderToStaticMarkup(<SignInForm />);

    expect(html).toContain(
      "Netwerkprobleem: de inlogservice is tijdelijk niet bereikbaar. Probeer het opnieuw.",
    );
  });
});

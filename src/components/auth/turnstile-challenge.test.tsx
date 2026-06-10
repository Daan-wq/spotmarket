import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TurnstileChallenge } from "./turnstile-challenge";

describe("TurnstileChallenge", () => {
  it("renders an accessible verification container", () => {
    const html = renderToStaticMarkup(
      <TurnstileChallenge
        siteKey="site-key"
        onToken={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(html).toContain('aria-label="Security verification"');
    expect(html).toContain('data-sitekey="site-key"');
  });
});

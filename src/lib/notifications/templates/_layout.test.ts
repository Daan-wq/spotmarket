import { afterEach, describe, expect, it, vi } from "vitest";

const savedEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_URL_EN: process.env.NEXT_PUBLIC_APP_URL_EN,
  NEXT_PUBLIC_APP_URL_NL: process.env.NEXT_PUBLIC_APP_URL_NL,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("email app URL", () => {
  afterEach(() => {
    restoreEnv();
    vi.resetModules();
  });

  it("defaults dashboard links to the canonical app domain", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL_EN;
    delete process.env.NEXT_PUBLIC_APP_URL_NL;
    vi.resetModules();

    const { styles } = await import("./_layout");

    expect(styles.appUrl).toBe("https://app.clipprofit.com");
  });

  it("prefers the canonical app env over the old Dutch app env", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.clipprofit.com";
    process.env.NEXT_PUBLIC_APP_URL_EN = "https://app.clipprofit.com";
    process.env.NEXT_PUBLIC_APP_URL_NL = "https://app.clipprofit.nl";
    vi.resetModules();

    const { styles } = await import("./_layout");

    expect(styles.appUrl).toBe("https://app.clipprofit.com");
  });

  it("renders the shared shell with the branded surface and dashboard CTA", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL_EN;
    delete process.env.NEXT_PUBLIC_APP_URL_NL;
    vi.resetModules();

    const React = await import("react");
    const { render } = await import("@react-email/components");
    const { EmailShell, styles } = await import("./_layout");

    const html = await render(
      React.createElement(
        EmailShell,
        {
          preview: "Preview text",
          heading: "Mail heading",
          children: React.createElement("p", { style: styles.p }, "Mail body"),
        },
      ),
    );

    expect(html).toContain("background-color:#f7f9f9");
    expect(html).toContain("ClipProfit");
    expect(html).toContain("Mail heading");
    expect(html).toContain("Open dashboard");
    expect(html).toContain("https://app.clipprofit.com");
  });
});

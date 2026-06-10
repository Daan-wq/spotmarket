import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BanManagementPanel } from "./ban-management-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const signal = {
  id: "signal-ip",
  type: "IP" as const,
  maskedValue: "203.0.113.xxx",
  lastSeenAt: "2026-06-10T10:00:00.000Z",
};

describe("BanManagementPanel", () => {
  it("shows only the account ban form before a creator is banned", () => {
    const html = renderToStaticMarkup(
      <BanManagementPanel creatorId="creator-1" ban={null} signals={[signal]} />,
    );

    expect(html).toContain("Account bannen");
    expect(html).not.toContain("IP-signaal activeren");
    expect(html).not.toContain("Harde IP-ban");
  });

  it("shows signals as separate unselected actions after a ban", () => {
    const html = renderToStaticMarkup(
      <BanManagementPanel
        creatorId="creator-1"
        ban={{
          id: "ban-1",
          reason: "Viewbotting",
          internalNote: null,
          bannedAt: "2026-06-10T10:00:00.000Z",
          indicators: [],
        }}
        signals={[signal]}
      />,
    );

    expect(html).toContain("IP-signaal activeren");
    expect(html).toContain("203.0.113.xxx");
    expect(html).not.toContain('checked=""');
  });

  it("warns about shared networks before a hard IP ban", () => {
    const html = renderToStaticMarkup(
      <BanManagementPanel
        creatorId="creator-1"
        ban={{
          id: "ban-1",
          reason: "Viewbotting",
          internalNote: null,
          bannedAt: "2026-06-10T10:00:00.000Z",
          indicators: [],
        }}
        signals={[signal]}
      />,
    );

    expect(html).toContain("Harde IP-ban");
    expect(html).toContain("gedeeld netwerk");
    expect(html).toContain("Verplichte motivatie");
  });
});

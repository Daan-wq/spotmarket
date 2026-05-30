import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminSidebar } from "./admin-sidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/discord" }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      operate: "Operatie",
      delivery: "Levering",
      control: "Controle",
      commandCenter: "Commandcenter",
      campaigns: "Campagnes",
      referrals: "Referralnetwerk",
      clippers: "Clippers",
      clipReview: "Clipreview",
      leads: "Leads",
      brands: "Merken",
      payouts: "Uitbetalingen",
      reports: "Rapportages",
      siteAnalytics: "Site-analytics",
      signals: "Signalen",
      discord: "Discord",
      search: "Zoeken",
      signOut: "Uitloggen",
    };
    return labels[key] ?? key;
  },
}));

describe("AdminSidebar", () => {
  it("zet Discord onder Merken in de adminnavigatie", () => {
    const html = renderToStaticMarkup(<AdminSidebar initials="A" email="admin@test.com" />);

    expect(html).toContain("/admin/discord");
    expect(html).toContain("Discord");
    expect(html.indexOf("Merken")).toBeLessThan(html.indexOf("Discord"));
  });
});

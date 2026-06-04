import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminSidebar } from "./admin-sidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/settings" }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      operate: "Operate",
      delivery: "Delivery",
      control: "Control",
      commandCenter: "Command Center",
      campaigns: "Campaigns",
      referrals: "Referral Network",
      clippers: "Clippers",
      clipReview: "Clip Review",
      leads: "Leads",
      brands: "Brands",
      payouts: "Payouts",
      reports: "Reports",
      siteAnalytics: "Site Analytics",
      signals: "Signals",
      discord: "Discord",
      profile: "Profile",
      profileComingSoon: "Coming soon",
      settings: "Settings",
      search: "Search",
      signOut: "Sign out",
    };
    return labels[key] ?? key;
  },
}));

describe("AdminSidebar", () => {
  it("renders Discord under Brands and shows the identity menu actions", () => {
    const html = renderToStaticMarkup(<AdminSidebar initials="A" email="admin@test.com" />);

    expect(html).toContain("/admin/discord");
    expect(html).toContain("Discord");
    expect(html.indexOf("Brands")).toBeLessThan(html.indexOf("Discord"));
    expect(html).toContain("Profile");
    expect(html).toContain("Coming soon");
    expect(html).toContain("/admin/settings");
    expect(html).toContain("Settings");
    expect(html).toContain("/api/auth/signout");
    expect(html).toContain("Sign out");
  });
});

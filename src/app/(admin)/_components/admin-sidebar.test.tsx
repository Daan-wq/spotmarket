import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminSidebar } from "./admin-sidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/discord" }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      operate: "Operate",
      delivery: "Delivery",
      control: "Control",
      commandCenter: "Command Center",
      campaigns: "Campaigns",
      referrals: "Referrals",
      clippers: "Clippers",
      clipReview: "Clip review",
      leads: "Leads",
      brands: "Brands",
      payouts: "Payouts",
      reports: "Reports",
      siteAnalytics: "Site analytics",
      signals: "Signals",
      discord: "Discord",
      search: "Search",
      signOut: "Log out",
    };
    return labels[key] ?? key;
  },
}));

describe("AdminSidebar", () => {
  it("renders the Discord admin navigation item", () => {
    const html = renderToStaticMarkup(<AdminSidebar initials="A" email="admin@test.com" />);

    expect(html).toContain("/admin/discord");
    expect(html).toContain("Discord");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ActivationCard } from "./activation-card";
import type { ActivationStatus } from "@/lib/activation";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, values?: Record<string, number>) => {
    if (key === "progress" && values) return `${values.completed}/${values.total}`;
    return key;
  },
}));

const baseActivation: ActivationStatus = {
  profileComplete: true,
  accountConnected: true,
  firstClipSubmitted: true,
  paymentMethodAdded: false,
  firstApproval: false,
  pending: ["paymentMethodAdded", "firstApproval"],
  completedCount: 3,
  totalSteps: 5,
  fullyActivated: false,
  nextStep: "paymentMethodAdded",
};

describe("ActivationCard", () => {
  it("routes missing payout setup to payout settings", async () => {
    const element = await ActivationCard({ activation: baseActivation });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('href="/creator/settings#payout-settings"');
    expect(html).not.toContain('href="/creator/payouts"');
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ActivationCard } from "./activation-card";
import type { ActivationStatus } from "@/lib/activation";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => {
    const labels: Record<string, string> = {
      title: "Activation",
      subtitle: "Finish setup",
      progress: "Progress",
      "profile.label": "Profile",
      "profile.description": "Complete profile",
      "profile.cta": "Edit profile",
      "account.label": "Account",
      "account.description": "Connect account",
      "account.cta": "Connect account",
      "clip.label": "Clip",
      "clip.description": "Submit clip",
      "clip.cta": "Browse campaigns",
      "payment.label": "Payment",
      "payment.description": "Add payout details",
      "payment.cta": "Add payment method",
      "approval.label": "Approval",
      "approval.description": "Get approved",
    };
    return labels[key] ?? key;
  },
}));

const baseActivation: ActivationStatus = {
  profileComplete: true,
  accountConnected: true,
  paymentMethodAdded: false,
  firstClipSubmitted: true,
  firstApproval: false,
  pending: ["paymentMethodAdded", "firstApproval"],
  completedCount: 3,
  totalSteps: 5,
  fullyActivated: false,
  nextStep: "paymentMethodAdded",
};

describe("ActivationCard", () => {
  it("links missing payout details to creator settings", async () => {
    const html = renderToStaticMarkup(
      await ActivationCard({ activation: baseActivation }),
    );

    expect(html).toContain('href="/creator/settings#payout-settings"');
    expect(html).not.toContain('href="/creator/payouts"');
  });
});

import {
  ActivationChecklist,
  type ChecklistItem,
} from "@/components/activation/activation-checklist";
import type { ActivationStatus } from "@/lib/activation";

interface ActivationCardProps {
  activation: ActivationStatus;
}

/**
 * Renders the dashboard activation checklist. Returns null once every step
 * is complete, so the dashboard collapses back to a pure data view.
 */
export function ActivationCard({ activation }: ActivationCardProps) {
  if (activation.fullyActivated) return null;

  const items: ChecklistItem[] = [
    {
      key: "profileComplete",
      label: "Complete your profile",
      description: "Add a display name so we can address you.",
      status: activation.profileComplete ? "complete" : "incomplete",
      cta: activation.profileComplete
        ? undefined
        : { label: "Edit", href: "/creator/profile" },
    },
    {
      key: "accountConnected",
      label: "Connect a social account",
      description:
        "OAuth-verified accounts unlock campaigns and let us track your views.",
      status: activation.accountConnected ? "complete" : "incomplete",
      cta: activation.accountConnected
        ? undefined
        : { label: "Connect", href: "/creator/connections" },
    },
    {
      key: "firstClipSubmitted",
      label: "Submit your first clip",
      description: "Pick a campaign you've joined and submit a clip URL.",
      status: activation.firstClipSubmitted
        ? "complete"
        : activation.accountConnected
          ? "incomplete"
          : "blocked",
      cta:
        activation.firstClipSubmitted || !activation.accountConnected
          ? undefined
          : { label: "Browse campaigns", href: "/creator/campaigns" },
    },
    {
      key: "paymentMethodAdded",
      label: "Add a payment method",
      description: "Required before your first payout — you can do this later.",
      status: activation.paymentMethodAdded ? "complete" : "incomplete",
      cta: activation.paymentMethodAdded
        ? undefined
        : { label: "Add", href: "/creator/payouts" },
    },
    {
      key: "firstApproval",
      label: "Get your first approved clip",
      description:
        "Once a clip is reviewed and approved, you start earning per verified view.",
      status: activation.firstApproval
        ? "complete"
        : activation.firstClipSubmitted
          ? "incomplete"
          : "blocked",
      cta: undefined,
    },
  ];

  return (
    <ActivationChecklist
      title="Get started"
      subtitle="Finish these steps to unlock your first payout."
      items={items}
    />
  );
}

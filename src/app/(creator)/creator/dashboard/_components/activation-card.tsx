import { getTranslations } from "next-intl/server";
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
export async function ActivationCard({ activation }: ActivationCardProps) {
  if (activation.fullyActivated) return null;

  const t = await getTranslations("dashboard.creator.activation");
  const items: ChecklistItem[] = [
    {
      key: "profileComplete",
      label: t("profile.label"),
      description: t("profile.description"),
      status: activation.profileComplete ? "complete" : "incomplete",
      cta: activation.profileComplete
        ? undefined
        : { label: t("profile.cta"), href: "/creator/profile" },
    },
    {
      key: "accountConnected",
      label: t("account.label"),
      description: t("account.description"),
      status: activation.accountConnected ? "complete" : "incomplete",
      cta: activation.accountConnected
        ? undefined
        : { label: t("account.cta"), href: "/creator/connections" },
    },
    {
      key: "firstClipSubmitted",
      label: t("clip.label"),
      description: t("clip.description"),
      status: activation.firstClipSubmitted
        ? "complete"
        : activation.accountConnected
          ? "incomplete"
          : "blocked",
      cta:
        activation.firstClipSubmitted || !activation.accountConnected
          ? undefined
          : { label: t("clip.cta"), href: "/creator/campaigns" },
    },
    {
      key: "paymentMethodAdded",
      label: t("payment.label"),
      description: t("payment.description"),
      status: activation.paymentMethodAdded ? "complete" : "incomplete",
      cta: activation.paymentMethodAdded
        ? undefined
        : { label: t("payment.cta"), href: "/creator/payouts" },
    },
    {
      key: "firstApproval",
      label: t("approval.label"),
      description: t("approval.description"),
      status: activation.firstApproval
        ? "complete"
        : activation.firstClipSubmitted
          ? "incomplete"
          : "blocked",
      cta: undefined,
    },
  ];
  const completed = items.filter((item) => item.status === "complete").length;

  return (
    <ActivationChecklist
      title={t("title")}
      subtitle={t("subtitle")}
      progressLabel={t("progress", { completed, total: items.length })}
      items={items}
    />
  );
}

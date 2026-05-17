import { getTranslations } from "next-intl/server";
import { AlertBanner } from "@/components/ui/alert-banner";
import type { ActivationStatus } from "@/lib/activation";

interface DashboardAlertsProps {
  activation: ActivationStatus;
  hasUnpaidBalance: boolean;
}

/**
 * Server-rendered alert stack. Each alert decides whether to show based on
 * activation state — the most urgent alert always renders first.
 */
export function DashboardAlerts({
  activation,
  hasUnpaidBalance,
}: DashboardAlertsProps) {
  return <DashboardAlertsContent activation={activation} hasUnpaidBalance={hasUnpaidBalance} />;
}

async function DashboardAlertsContent({
  activation,
  hasUnpaidBalance,
}: DashboardAlertsProps) {
  const t = await getTranslations("dashboard.creator.alerts");
  const alerts: Array<React.ReactNode> = [];

  if (!activation.accountConnected) {
    alerts.push(
      <AlertBanner
        key="connect"
        tone="warning"
        title={t("connect.title")}
        description={t("connect.description")}
        cta={{ label: t("connect.cta"), href: "/creator/connections" }}
      />,
    );
  } else if (hasUnpaidBalance && !activation.paymentMethodAdded) {
    alerts.push(
      <AlertBanner
        key="payment"
        tone="warning"
        title={t("payment.title")}
        description={t("payment.description")}
        cta={{ label: t("payment.cta"), href: "/creator/payouts" }}
      />,
    );
  }

  if (alerts.length === 0) return null;

  return <div className="space-y-2">{alerts}</div>;
}

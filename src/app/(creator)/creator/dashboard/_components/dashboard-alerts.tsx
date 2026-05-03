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
  const alerts: Array<React.ReactNode> = [];

  if (!activation.accountConnected) {
    alerts.push(
      <AlertBanner
        key="connect"
        tone="warning"
        title="Connect a social account to start earning"
        description="We need an OAuth-verified account to track your views and match clips to campaigns."
        cta={{ label: "Connect now", href: "/creator/connections" }}
      />,
    );
  } else if (hasUnpaidBalance && !activation.paymentMethodAdded) {
    alerts.push(
      <AlertBanner
        key="payment"
        tone="warning"
        title="Add a payment method before your next payout"
        description="You have unpaid earnings, but we don't have a way to send them to you yet."
        cta={{ label: "Add method", href: "/creator/payouts" }}
      />,
    );
  }

  if (alerts.length === 0) return null;

  return <div className="space-y-2">{alerts}</div>;
}

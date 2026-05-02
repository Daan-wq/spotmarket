/**
 * React Email template registry. Maps a `NotificationType` to a renderable
 * email element + subject string.
 *
 * Templates live in this directory and are intentionally minimal — Resend
 * will render the HTML and ClipProfit's transactional email styling stays
 * consistent across types.
 */

import type { ReactElement } from "react";
import type { NotificationType } from "@prisma/client";

import { PerformanceViralEmail } from "./performance-viral";
import { PerformanceUnderperformEmail } from "./performance-underperform";
import { EarningsMilestoneEmail } from "./earnings-milestone";
import { SignalFlaggedEmail } from "./signal-flagged";
import { TokenBrokenEmail } from "./token-broken";
import { GenericNotificationEmail } from "./generic";

export function renderTemplate(
  type: NotificationType,
  data: Record<string, unknown>,
): ReactElement {
  switch (type) {
    case "PERFORMANCE_VIRAL":
      return <PerformanceViralEmail data={data} />;
    case "PERFORMANCE_UNDERPERFORM":
      return <PerformanceUnderperformEmail data={data} />;
    case "EARNINGS_MILESTONE":
      return <EarningsMilestoneEmail data={data} />;
    case "SIGNAL_FLAGGED":
      return <SignalFlaggedEmail data={data} />;
    case "TOKEN_BROKEN":
      return <TokenBrokenEmail data={data} />;
    default:
      return <GenericNotificationEmail type={type} data={data} />;
  }
}

export function getEmailSubject(
  type: NotificationType,
  data: Record<string, unknown>,
): string {
  switch (type) {
    case "PERFORMANCE_VIRAL":
      return `🚀 Your clip is going viral`;
    case "PERFORMANCE_UNDERPERFORM":
      return `📉 One of your clips is underperforming`;
    case "EARNINGS_MILESTONE": {
      const milestone = data.milestone ?? data.amount ?? "a new milestone";
      return `🎉 You hit ${milestone}`;
    }
    case "SIGNAL_FLAGGED":
      return `⚠️ Submission flagged for review`;
    case "TOKEN_BROKEN":
      return `🔌 Reconnect your social account`;
    case "SUBMISSION_APPROVED":
      return `Your submission was approved`;
    case "SUBMISSION_REJECTED":
      return `Your submission was reviewed`;
    case "PAYOUT_SENT":
      return `Your payout has been sent`;
    case "WITHDRAWAL_PROCESSED":
      return `Your withdrawal was processed`;
    case "CAMPAIGN_LAUNCHED":
      return `New campaign available`;
    default:
      return `ClipProfit notification`;
  }
}

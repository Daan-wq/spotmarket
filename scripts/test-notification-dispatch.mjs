/**
 * Synthetic firing dev script for Subsystem E (Notifications).
 *
 * Usage:
 *   node scripts/test-notification-dispatch.mjs <userId> [type]
 *
 * Calls the dispatcher directly (bypasses the event bus) so you can
 * verify channel fan-out without B/A having shipped events yet.
 */

import { dispatchNotification } from "../src/lib/notifications/dispatcher.ts";

const [, , userId, typeArg] = process.argv;

if (!userId) {
  console.error("Usage: node scripts/test-notification-dispatch.mjs <userId> [type]");
  process.exit(1);
}

const type = typeArg ?? "PERFORMANCE_VIRAL";

const samplePayloads = {
  PERFORMANCE_VIRAL: {
    submissionId: "sub_test",
    campaignId: "camp_test",
    benchmarkRatio: 4.7,
    occurredAt: new Date().toISOString(),
  },
  PERFORMANCE_UNDERPERFORM: {
    submissionId: "sub_test",
    campaignId: "camp_test",
    weakDimensions: ["views", "likeRatio"],
    occurredAt: new Date().toISOString(),
  },
  EARNINGS_MILESTONE: { milestone: "$100", amount: 100 },
  SIGNAL_FLAGGED: {
    submissionId: "sub_test",
    signalId: "sig_test",
    signal: "VELOCITY_SPIKE",
    severity: "WARN",
    occurredAt: new Date().toISOString(),
  },
  TOKEN_BROKEN: {
    submissionId: "sub_test",
    signalId: "sig_test",
    signal: "TOKEN_BROKEN",
    severity: "CRITICAL",
    connectionType: "IG",
    occurredAt: new Date().toISOString(),
  },
};

const data = samplePayloads[type] ?? { note: "synthetic test" };
const id = await dispatchNotification(userId, type, data);
console.log("Dispatched notification:", { id, userId, type });
process.exit(0);

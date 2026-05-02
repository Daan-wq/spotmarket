/**
 * Event-bus subscriber for Subsystem E.
 *
 * Maps domain events (published by Subsystem A/B) into Notification rows
 * via `dispatchNotification`.
 *
 * Mapping:
 *   - `submission.viral`         → PERFORMANCE_VIRAL        (creator)
 *   - `submission.underperform`  → PERFORMANCE_UNDERPERFORM (creator)
 *   - `submission.flagged` (severity ≥ WARN) → SIGNAL_FLAGGED (all admins)
 *   - `submission.flagged` (signal=TOKEN_BROKEN) → TOKEN_BROKEN (creator)
 *
 * Defensive — events from B may not yet be published in dev. Handlers
 * silently no-op if the referenced submission/user doesn't exist.
 */

import { on } from "@/lib/event-bus";
import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "./dispatcher";
import type {
  SubmissionViralEvent,
  SubmissionUnderperformEvent,
  SubmissionFlaggedEvent,
} from "@/lib/contracts/events";

let registered = false;

export function registerNotificationHandlers(): void {
  if (registered) return;
  registered = true;

  on("submission.viral", handleSubmissionViral);
  on("submission.underperform", handleSubmissionUnderperform);
  on("submission.flagged", handleSubmissionFlagged);
}

async function resolveCreatorUserId(submissionId: string): Promise<string | null> {
  const sub = await prisma.campaignSubmission.findUnique({
    where: { id: submissionId },
    select: { creatorId: true },
  });
  // CampaignSubmission.creatorId references User.id directly.
  return sub?.creatorId ?? null;
}

async function handleSubmissionViral(event: SubmissionViralEvent): Promise<void> {
  try {
    const userId = await resolveCreatorUserId(event.submissionId);
    if (!userId) return;
    await dispatchNotification(userId, "PERFORMANCE_VIRAL", {
      submissionId: event.submissionId,
      campaignId: event.campaignId,
      benchmarkRatio: event.benchmarkRatio,
      occurredAt: event.occurredAt,
    });
  } catch (err) {
    console.error("[notifications] viral handler failed", err);
  }
}

async function handleSubmissionUnderperform(
  event: SubmissionUnderperformEvent,
): Promise<void> {
  try {
    const userId = await resolveCreatorUserId(event.submissionId);
    if (!userId) return;
    await dispatchNotification(userId, "PERFORMANCE_UNDERPERFORM", {
      submissionId: event.submissionId,
      campaignId: event.campaignId,
      weakDimensions: event.weakDimensions,
      occurredAt: event.occurredAt,
    });
  } catch (err) {
    console.error("[notifications] underperform handler failed", err);
  }
}

async function handleSubmissionFlagged(event: SubmissionFlaggedEvent): Promise<void> {
  try {
    // Token broken → notify the creator only.
    if (event.signal === "TOKEN_BROKEN") {
      const userId = await resolveCreatorUserId(event.submissionId);
      if (!userId) return;
      await dispatchNotification(userId, "TOKEN_BROKEN", {
        submissionId: event.submissionId,
        signalId: event.signalId,
        signal: event.signal,
        severity: event.severity,
        occurredAt: event.occurredAt,
      });
      return;
    }

    // Other flags at severity ≥ WARN → notify all admins.
    if (event.severity === "INFO") return;

    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });
    await Promise.all(
      admins.map((a) =>
        dispatchNotification(a.id, "SIGNAL_FLAGGED", {
          submissionId: event.submissionId,
          signalId: event.signalId,
          signal: event.signal,
          severity: event.severity,
          occurredAt: event.occurredAt,
        }),
      ),
    );
  } catch (err) {
    console.error("[notifications] flagged handler failed", err);
  }
}

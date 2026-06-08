/**
 * Maps domain events into notifications.
 *
 * Connection token notifications are created by connection-health incidents.
 * Submission TOKEN_BROKEN signals remain available to admins, but do not send
 * additional creator notifications for every affected submission.
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
  } catch (error) {
    console.error("[notifications] viral handler failed", error);
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
  } catch (error) {
    console.error("[notifications] underperform handler failed", error);
  }
}

async function handleSubmissionFlagged(
  event: SubmissionFlaggedEvent,
): Promise<void> {
  try {
    if (event.signal === "TOKEN_BROKEN") return;
    if (event.severity === "INFO") return;

    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        dispatchNotification(admin.id, "SIGNAL_FLAGGED", {
          submissionId: event.submissionId,
          signalId: event.signalId,
          signal: event.signal,
          severity: event.severity,
          occurredAt: event.occurredAt,
        }),
      ),
    );
  } catch (error) {
    console.error("[notifications] flagged handler failed", error);
  }
}

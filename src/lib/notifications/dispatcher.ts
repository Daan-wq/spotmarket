/**
 * Notification dispatcher — channel fan-out.
 *
 * Owner: Subsystem E.
 *
 * Reads `NotificationRule` for the (user, type) pair to determine which
 * channels (IN_APP / EMAIL / DISCORD) to deliver on. Falls back to
 * `DEFAULT_CHANNELS` from `@/lib/contracts/notifications` when no rule exists.
 *
 * Always creates a `Notification` row when IN_APP is selected (or as the
 * audit trail record otherwise — we always persist something so the cron
 * can retry failed external sends).
 *
 * Email and Discord delivery is best-effort. Failures are recorded inside
 * `Notification.data._delivery` (since we can't extend the schema in this
 * subsystem) for the retry cron to pick up later.
 */

import { prisma } from "@/lib/prisma";
import { NotificationType, type Prisma } from "@prisma/client";
import { Resend } from "resend";
import { render } from "@react-email/components";
import {
  DEFAULT_CHANNELS,
  type NotificationChannel,
} from "@/lib/contracts/notifications";
import { renderTemplate, getEmailSubject } from "./templates";

export { NotificationType };

/** Internal delivery state we stash inside Notification.data. */
interface DeliveryState {
  channels: NotificationChannel[];
  email?: { status: "pending" | "sent" | "failed"; attempts: number; error?: string };
  discord?: { status: "pending" | "sent" | "failed"; attempts: number; error?: string };
  lastAttemptAt?: string;
}

interface DispatchOptions {
  /** Override channel selection. Skips rule lookup when set. */
  channelsOverride?: NotificationChannel[];
}

/* ----------------------------- channel resolution ----------------------------- */

async function resolveChannels(
  userId: string,
  type: NotificationType,
): Promise<NotificationChannel[]> {
  const rule = await prisma.notificationRule.findUnique({
    where: { userId_type: { userId, type } },
  });

  if (rule) {
    if (!rule.enabled) return [];
    return rule.channels as NotificationChannel[];
  }
  return DEFAULT_CHANNELS[type] ?? ["IN_APP"];
}

/* --------------------------------- email ---------------------------------- */

let resendClient: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

async function sendEmail(
  to: string,
  type: NotificationType,
  data: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = getResend();
  if (!client) return { ok: false, error: "RESEND_API_KEY not configured" };

  try {
    const element = renderTemplate(type, data);
    const html = await render(element);
    const subject = getEmailSubject(type, data);

    const res = await client.emails.send({
      from: "ClipProfit <noreply@clipprofit.com>",
      to,
      subject,
      html,
    });
    if ((res as { error?: unknown }).error) {
      return { ok: false, error: JSON.stringify((res as { error?: unknown }).error) };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/* -------------------------------- discord --------------------------------- */

async function sendDiscord(
  type: NotificationType,
  data: Record<string, unknown>,
  isAdmin: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const webhookUrl = isAdmin
    ? process.env.DISCORD_WEBHOOK_URL ?? process.env.DISCORD_DEALS_WEBHOOK_URL
    : process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return { ok: false, error: "DISCORD_WEBHOOK_URL not configured" };

  const titleMap: Record<string, string> = {
    PERFORMANCE_VIRAL: "🚀 Submission going viral",
    PERFORMANCE_UNDERPERFORM: "📉 Submission underperforming",
    EARNINGS_MILESTONE: "🎉 Earnings milestone",
    SIGNAL_FLAGGED: "⚠️ Signal flagged",
    TOKEN_BROKEN: "🔌 Connection broken",
    SUBMISSION_APPROVED: "✅ Submission approved",
    SUBMISSION_REJECTED: "❌ Submission rejected",
  };

  const title = titleMap[type] ?? type;
  const payload = {
    embeds: [
      {
        title,
        description: summarizeForDiscord(type, data),
        color: type === "PERFORMANCE_VIRAL" ? 0x23a559 : 0x534ab7,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { ok: false, error: `Discord HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function summarizeForDiscord(type: NotificationType, data: Record<string, unknown>): string {
  const json = JSON.stringify(data);
  const safe = json.length > 800 ? json.slice(0, 800) + "…" : json;
  return `\`${type}\`\n\`\`\`json\n${safe}\n\`\`\``;
}

/* --------------------------------- core ----------------------------------- */

/**
 * Public dispatch entry point. Persists an in-app row when IN_APP is
 * selected and fans out to email/Discord per the user's rule.
 *
 * Returns the created Notification id (or null when no channels at all).
 */
export async function dispatchNotification(
  userId: string,
  type: NotificationType,
  data: Record<string, unknown>,
  options: DispatchOptions = {},
): Promise<string | null> {
  const channels = options.channelsOverride ?? (await resolveChannels(userId, type));
  if (channels.length === 0) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, discordId: true, role: true },
  });
  if (!user) return null;

  const wantInApp = channels.includes("IN_APP");
  const wantEmail = channels.includes("EMAIL");
  const wantDiscord = channels.includes("DISCORD");

  // Always create a Notification row when IN_APP is requested. When only
  // external channels are requested we still persist a row as the audit
  // trail / retry anchor — but mark it acknowledged so it doesn't appear
  // in the user's bell.
  const delivery: DeliveryState = {
    channels,
    lastAttemptAt: new Date().toISOString(),
  };
  if (wantEmail) delivery.email = { status: "pending", attempts: 0 };
  if (wantDiscord) delivery.discord = { status: "pending", attempts: 0 };

  const enrichedData: Prisma.InputJsonValue = {
    ...data,
    _delivery: delivery as unknown as Prisma.InputJsonValue,
  };

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      data: enrichedData,
      acknowledged: !wantInApp,
      acknowledgedAt: !wantInApp ? new Date() : null,
    },
  });

  // External channels (best-effort, parallel)
  await Promise.all([
    wantEmail && user.email
      ? sendEmail(user.email, type, data).then((r) => {
          delivery.email = {
            status: r.ok ? "sent" : "failed",
            attempts: 1,
            error: r.ok ? undefined : r.error,
          };
        })
      : Promise.resolve(),
    wantDiscord
      ? sendDiscord(type, data, user.role === "admin").then((r) => {
          delivery.discord = {
            status: r.ok ? "sent" : "failed",
            attempts: 1,
            error: r.ok ? undefined : r.error,
          };
        })
      : Promise.resolve(),
  ]);

  // Persist updated delivery state.
  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      data: {
        ...data,
        _delivery: delivery as unknown as Prisma.InputJsonValue,
      } as Prisma.InputJsonValue,
    },
  });

  return notification.id;
}

/* ----------------------------- legacy shim API ---------------------------- */

/**
 * Back-compat shim for legacy `createNotification()` call sites. Delegates
 * to `dispatchNotification` so existing callers automatically get the new
 * channel fan-out behavior.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  data: Record<string, unknown>,
): Promise<void> {
  await dispatchNotification(userId, type, data);
}

/* --------------------------------- retry ---------------------------------- */

const MAX_ATTEMPTS = 3;

/**
 * Drains failed external-channel deliveries and retries them.
 * Used by `/api/cron/notification-dispatch`.
 */
export async function retryFailedDeliveries(limit = 50): Promise<{
  scanned: number;
  retried: number;
  succeeded: number;
}> {
  // Find recent notifications with delivery state that contain a failure.
  // We scan the last 7 days only.
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const candidates = await prisma.notification.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      userId: true,
      type: true,
      data: true,
      user: { select: { email: true, discordId: true, role: true } },
    },
  });

  let scanned = 0;
  let retried = 0;
  let succeeded = 0;

  for (const n of candidates) {
    const data = (n.data ?? {}) as Record<string, unknown>;
    const delivery = data._delivery as DeliveryState | undefined;
    if (!delivery) continue;

    const emailFailed =
      delivery.email?.status === "failed" && (delivery.email.attempts ?? 0) < MAX_ATTEMPTS;
    const discordFailed =
      delivery.discord?.status === "failed" &&
      (delivery.discord.attempts ?? 0) < MAX_ATTEMPTS;

    if (!emailFailed && !discordFailed) continue;
    scanned++;
    if (retried >= limit) break;
    retried++;

    const baseData = { ...data };
    delete (baseData as Record<string, unknown>)._delivery;

    if (emailFailed && n.user?.email) {
      const r = await sendEmail(n.user.email, n.type, baseData);
      delivery.email = {
        status: r.ok ? "sent" : "failed",
        attempts: (delivery.email?.attempts ?? 0) + 1,
        error: r.ok ? undefined : r.error,
      };
      if (r.ok) succeeded++;
    }
    if (discordFailed) {
      const r = await sendDiscord(n.type, baseData, n.user?.role === "admin");
      delivery.discord = {
        status: r.ok ? "sent" : "failed",
        attempts: (delivery.discord?.attempts ?? 0) + 1,
        error: r.ok ? undefined : r.error,
      };
      if (r.ok) succeeded++;
    }
    delivery.lastAttemptAt = new Date().toISOString();

    await prisma.notification.update({
      where: { id: n.id },
      data: {
        data: {
          ...baseData,
          _delivery: delivery as unknown as Prisma.InputJsonValue,
        } as Prisma.InputJsonValue,
      },
    });
  }

  return { scanned, retried, succeeded };
}

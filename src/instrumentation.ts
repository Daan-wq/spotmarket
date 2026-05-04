/**
 * Next.js boot hook — runs once per server process.
 *
 * Subsystem E uses this to register its event-bus handlers and start the
 * subscription loop. Defensive: if `REDIS_URL` is not configured (e.g. in
 * dev), `startEventBus` will simply log and skip. Other subsystems may
 * also register handlers in this file in the future.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { registerNotificationHandlers } = await import(
      "@/lib/notifications/event-subscriber"
    );
    registerNotificationHandlers();
  } catch (err) {
    console.error("[instrumentation] failed to register notification handlers", err);
  }

  // Only attempt to start the bus if Redis is configured. Avoids noisy
  // crashes in local dev / CI without REDIS_URL.
  if (process.env.REDIS_URL) {
    try {
      const { startEventBus } = await import("@/lib/event-bus");
      startEventBus();
    } catch (err) {
      console.error("[instrumentation] failed to start event bus", err);
    }
  }
}

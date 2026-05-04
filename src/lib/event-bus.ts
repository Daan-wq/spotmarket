/**
 * Event bus — Redis pub/sub publisher + subscriber registry.
 *
 * Owner: A (defines + ships). Consumers: B/C/D/E register handlers at server boot.
 *
 * Single channel `clipprofit:domain-events`; consumers filter on `event.type`.
 * Lazy connections so a missing `REDIS_URL` doesn't crash the build / cold start.
 *
 * Publish guarantees: at-most-once. If a consumer is offline when the event fires,
 * it misses it. Consumers that need replay should poll Prisma instead — Subsystem A
 * intentionally keeps the bus a thin notification layer, with Prisma as the source
 * of truth for state.
 */

import Redis from "ioredis";
import {
  EVENT_BUS_CHANNEL,
  type DomainEvent,
  type DomainEventType,
} from "@/lib/contracts/events";

type Handler<E extends DomainEvent = DomainEvent> = (event: E) => Promise<void> | void;

let pub: Redis | null = null;
let sub: Redis | null = null;
const handlers: Map<DomainEventType, Set<Handler>> = new Map();
let subscriptionStarted = false;

function getRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("event-bus: REDIS_URL is not set");
  }
  return url;
}

function getPublisher(): Redis {
  if (!pub) {
    pub = new Redis(getRedisUrl(), { maxRetriesPerRequest: null });
  }
  return pub;
}

function getSubscriber(): Redis {
  if (!sub) {
    sub = new Redis(getRedisUrl(), { maxRetriesPerRequest: null });
  }
  return sub;
}

/** Publish a domain event. Fire-and-forget; failures are logged, not thrown. */
export async function publishEvent(event: DomainEvent): Promise<void> {
  try {
    const payload = JSON.stringify(event);
    await getPublisher().publish(EVENT_BUS_CHANNEL, payload);
  } catch (err) {
    console.error("[event-bus] publish failed", { type: event.type, err });
  }
}

/**
 * Register a handler for one event type. Multiple handlers per type allowed.
 * Idempotent — re-registering the same function is a no-op.
 */
export function on<T extends DomainEventType>(
  type: T,
  handler: Handler<Extract<DomainEvent, { type: T }>>
): void {
  let set = handlers.get(type);
  if (!set) {
    set = new Set();
    handlers.set(type, set);
  }
  set.add(handler as Handler);
}

/**
 * Start the subscription loop. Call once per process at server boot.
 * Safe to call multiple times — idempotent.
 */
export function startEventBus(): void {
  if (subscriptionStarted) return;
  subscriptionStarted = true;

  const subscriber = getSubscriber();

  void subscriber.subscribe(EVENT_BUS_CHANNEL).catch((err) => {
    console.error("[event-bus] subscribe failed", err);
    subscriptionStarted = false;
  });

  subscriber.on("message", (channel, raw) => {
    if (channel !== EVENT_BUS_CHANNEL) return;
    let event: DomainEvent;
    try {
      event = JSON.parse(raw) as DomainEvent;
    } catch (err) {
      console.error("[event-bus] malformed event", { raw, err });
      return;
    }
    const set = handlers.get(event.type);
    if (!set || set.size === 0) return;
    for (const handler of set) {
      Promise.resolve(handler(event)).catch((err) => {
        console.error("[event-bus] handler error", { type: event.type, err });
      });
    }
  });
}

/** Test/teardown helper. Closes both connections. */
export async function closeEventBus(): Promise<void> {
  subscriptionStarted = false;
  handlers.clear();
  await Promise.all([pub?.quit(), sub?.quit()]).catch(() => {});
  pub = null;
  sub = null;
}

import Redis from "ioredis";
import { prisma } from "@/lib/prisma";
import type {
  BanDecision,
  BanIndicatorType,
  IndicatorMatch,
} from "./risk-engine";

const ACCOUNT_CACHE_TTL_SECONDS = 60;
const SIGNAL_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const SIGNUP_WINDOW_MS = 24 * 60 * 60 * 1000;

type CacheClient = {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
};

type StoreDependencies = {
  db: {
    accountBan: {
      findFirst(args: Record<string, unknown>): Promise<{ id: string } | null>;
    };
    banIndicator: {
      findMany(args: Record<string, unknown>): Promise<
        Array<{
          id: string;
          accountBanId: string;
          type: BanIndicatorType;
          strength: "WEAK" | "STRONG";
          mode: "LAYERED" | "HARD";
        }>
      >;
    };
    accessSignal: {
      upsert(args: Record<string, unknown>): Promise<unknown>;
      findMany(args: Record<string, unknown>): Promise<
        Array<{ supabaseId: string }>
      >;
    };
  };
  cache: CacheClient | null;
};

export type SignalObservation = {
  type: BanIndicatorType;
  valueHash: string;
  maskedValue: string;
  metadata?: Record<string, string | number | boolean>;
};

export type ActiveIndicatorMatch = IndicatorMatch & {
  id: string;
  accountBanId: string;
};

let redis: Redis | null | undefined;

function getRedisCache(): CacheClient | null {
  if (redis !== undefined) return redis;
  const url = process.env.REDIS_URL;
  if (!url) {
    redis = null;
    return null;
  }
  redis = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  return redis;
}

function defaultDependencies(): StoreDependencies {
  return {
    db: prisma as unknown as StoreDependencies["db"],
    cache: getRedisCache(),
  };
}

function accountCacheKey(supabaseId: string): string {
  return `ban-evasion:account:${supabaseId}`;
}

export async function getActiveAccountBan(
  supabaseId: string,
  dependencies = defaultDependencies(),
): Promise<{ active: boolean; banId: string | null }> {
  const key = accountCacheKey(supabaseId);
  try {
    const cached = await dependencies.cache?.get(key);
    if (cached) {
      return JSON.parse(cached) as { active: boolean; banId: string | null };
    }
  } catch (error) {
    console.error("[ban-evasion] account cache read failed", error);
  }

  const ban = await dependencies.db.accountBan.findFirst({
    where: {
      liftedAt: null,
      user: { supabaseId, role: "creator" },
    },
    select: { id: true },
    orderBy: { bannedAt: "desc" },
  });
  const result = { active: Boolean(ban), banId: ban?.id ?? null };

  try {
    await dependencies.cache?.setex(
      key,
      ACCOUNT_CACHE_TTL_SECONDS,
      JSON.stringify(result),
    );
  } catch (error) {
    console.error("[ban-evasion] account cache write failed", error);
  }

  return result;
}

export async function invalidateAccountBanCache(
  supabaseId: string,
  dependencies = defaultDependencies(),
): Promise<void> {
  try {
    await dependencies.cache?.del(accountCacheKey(supabaseId));
  } catch (error) {
    console.error("[ban-evasion] account cache invalidation failed", error);
  }
}

export async function findActiveIndicatorMatches(
  observations: Array<Pick<SignalObservation, "type" | "valueHash">>,
  dependencies = defaultDependencies(),
): Promise<ActiveIndicatorMatch[]> {
  if (observations.length === 0) return [];

  return dependencies.db.banIndicator.findMany({
    where: {
      deactivatedAt: null,
      accountBan: { liftedAt: null },
      OR: observations.map((observation) => ({
        type: observation.type,
        valueHash: observation.valueHash,
      })),
    },
    select: {
      id: true,
      accountBanId: true,
      type: true,
      strength: true,
      mode: true,
    },
  });
}

export async function recordAccessSignals(
  input: {
    supabaseId: string;
    userId?: string | null;
    source: "signup" | "signin" | "oauth" | "onboarding" | "session";
    observations: SignalObservation[];
    now?: Date;
  },
  dependencies = defaultDependencies(),
): Promise<void> {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + SIGNAL_RETENTION_MS);
  const signupObservedAt = input.source === "signup" ? now : undefined;

  await Promise.all(
    input.observations.map((observation) =>
      dependencies.db.accessSignal.upsert({
        where: {
          supabaseId_type_valueHash: {
            supabaseId: input.supabaseId,
            type: observation.type,
            valueHash: observation.valueHash,
          },
        },
        create: {
          supabaseId: input.supabaseId,
          userId: input.userId ?? null,
          type: observation.type,
          valueHash: observation.valueHash,
          maskedValue: observation.maskedValue,
          metadata: {
            source: input.source,
            ...(observation.metadata ?? {}),
          },
          signupObservedAt,
          firstSeenAt: now,
          lastSeenAt: now,
          expiresAt,
        },
        update: {
          ...(input.userId ? { userId: input.userId } : {}),
          maskedValue: observation.maskedValue,
          metadata: {
            source: input.source,
            ...(observation.metadata ?? {}),
          },
          ...(signupObservedAt ? { signupObservedAt } : {}),
          lastSeenAt: now,
          expiresAt,
        },
      }),
    ),
  );
}

export async function countRecentDistinctSignupsForIp(
  ipHash: string,
  now = new Date(),
  dependencies = defaultDependencies(),
): Promise<number> {
  const rows = await dependencies.db.accessSignal.findMany({
    where: {
      type: "IP",
      valueHash: ipHash,
      signupObservedAt: {
        gte: new Date(now.getTime() - SIGNUP_WINDOW_MS),
      },
    },
    distinct: ["supabaseId"],
    select: { supabaseId: true },
  });
  return rows.length;
}

export async function logEnforcementEvent(input: {
  accountBanId?: string | null;
  subjectHash?: string | null;
  decision: BanDecision;
  observedDecision: BanDecision;
  reasonCode: string;
  matchedIndicatorIds: string[];
  metadata?: Record<string, string | number | boolean>;
}): Promise<void> {
  await prisma.enforcementEvent.create({
    data: {
      accountBanId: input.accountBanId ?? null,
      subjectHash: input.subjectHash ?? null,
      decision: input.decision,
      observedDecision: input.observedDecision,
      reasonCode: input.reasonCode,
      matchedIndicatorIds: input.matchedIndicatorIds,
      metadata: input.metadata ?? {},
    },
  });
}

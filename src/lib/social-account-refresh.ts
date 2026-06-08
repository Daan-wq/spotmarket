import {
  Prisma,
  type ConnectionHealthResolutionReason,
  type ConnectionType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordRawApiResponse } from "@/lib/metrics/raw-storage";
import {
  recordConnectionHealthFailure,
  resolveConnectionHealthIncident,
} from "@/lib/connection-health";

type DbClient = typeof prisma | Prisma.TransactionClient;
type ResolveIncident = typeof resolveConnectionHealthIncident;
type RecordHealthFailure = typeof recordConnectionHealthFailure;

export interface AccountRefreshSuccessInput {
  connectionType: ConnectionType;
  connectionId: string;
  audienceCount?: number | null;
  followingCount?: number | null;
  totalLikes?: bigint | null;
  videoCount?: number | null;
  isVerified?: boolean | null;
  raw?: unknown;
  capturedAt?: Date;
  resolutionReason?: ConnectionHealthResolutionReason;
}

export interface AccountRefreshFailureInput {
  connectionType: ConnectionType;
  connectionId: string;
  error: unknown;
  code?: string;
  attemptedAt?: Date;
}

export async function recordAccountRefreshSuccess(
  input: AccountRefreshSuccessInput,
  db: DbClient = prisma,
  resolveIncident: ResolveIncident = resolveConnectionHealthIncident,
): Promise<void> {
  const capturedAt = input.capturedAt ?? new Date();
  await db.platformAccountSnapshot.create({
    data: {
      connectionType: input.connectionType,
      connectionId: input.connectionId,
      capturedAt,
      audienceCount: input.audienceCount ?? null,
      followingCount: input.followingCount ?? null,
      totalLikes: input.totalLikes ?? null,
      videoCount: input.videoCount ?? null,
      isVerified: input.isVerified ?? null,
      raw: input.raw == null ? Prisma.JsonNull : (input.raw as Prisma.InputJsonValue),
    },
  });

  await updateConnectionRefreshState(db, input.connectionType, input.connectionId, {
    accountRefreshStatus: "SUCCESS",
    lastRefreshAttemptAt: capturedAt,
    lastSuccessfulRefreshAt: capturedAt,
    lastRefreshFailedAt: null,
    lastRefreshErrorCode: null,
    lastRefreshErrorMessage: null,
    ...legacyCountUpdate(input, capturedAt),
  });
  await resolveIncident(
    input.connectionType,
    input.connectionId,
    input.resolutionReason ?? "REFRESH_SUCCEEDED",
    capturedAt,
    db,
  );

  if (input.raw != null) {
    await recordRawApiResponse({
      connectionType: input.connectionType,
      connectionId: input.connectionId,
      endpoint: `${input.connectionType.toLowerCase()}.account.profile`,
      payload: input.raw,
    });
  }
}

export async function recordAccountRefreshFailure(
  input: AccountRefreshFailureInput,
  db: DbClient = prisma,
  recordHealthFailure: RecordHealthFailure = recordConnectionHealthFailure,
): Promise<void> {
  const attemptedAt = input.attemptedAt ?? new Date();
  const failure = normalizeAccountRefreshError(input.error, input.code);
  await updateConnectionRefreshState(db, input.connectionType, input.connectionId, {
    accountRefreshStatus: "FAILED",
    lastRefreshAttemptAt: attemptedAt,
    lastRefreshFailedAt: attemptedAt,
    lastRefreshErrorCode: failure.code,
    lastRefreshErrorMessage: failure.message,
  });
  await recordHealthFailure(
    {
      connectionType: input.connectionType,
      connectionId: input.connectionId,
      error: input.error,
      code: input.code,
      detectedAt: attemptedAt,
    },
    db,
  );
}

export function normalizeAccountRefreshError(
  error: unknown,
  code = "REFRESH_FAILED",
): { code: string; message: string } {
  const message = error instanceof Error ? error.message : String(error || "Account refresh failed");
  return {
    code: code.slice(0, 80),
    message: message.slice(0, 500),
  };
}

async function updateConnectionRefreshState(
  db: DbClient,
  connectionType: ConnectionType,
  connectionId: string,
  data: Prisma.CreatorIgConnectionUpdateInput &
    Prisma.CreatorFbConnectionUpdateInput &
    Prisma.CreatorYtConnectionUpdateInput &
    Prisma.CreatorTikTokConnectionUpdateInput,
): Promise<void> {
  if (connectionType === "IG") {
    await db.creatorIgConnection.update({ where: { id: connectionId }, data });
    return;
  }
  if (connectionType === "FB") {
    await db.creatorFbConnection.update({ where: { id: connectionId }, data });
    return;
  }
  if (connectionType === "YT") {
    await db.creatorYtConnection.update({ where: { id: connectionId }, data });
    return;
  }
  await db.creatorTikTokConnection.update({ where: { id: connectionId }, data });
}

function legacyCountUpdate(
  input: AccountRefreshSuccessInput,
  capturedAt: Date,
):
  | Prisma.CreatorIgConnectionUpdateInput
  | Prisma.CreatorFbConnectionUpdateInput
  | Prisma.CreatorYtConnectionUpdateInput
  | Prisma.CreatorTikTokConnectionUpdateInput {
  if (input.audienceCount == null) return {};
  if (input.connectionType === "YT") {
    return {
      subscriberCount: input.audienceCount,
      videoCount: input.videoCount ?? undefined,
    };
  }
  return {
    followerCount: input.audienceCount,
    lastCheckedAt: capturedAt,
  };
}

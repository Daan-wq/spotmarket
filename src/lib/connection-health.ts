import type {
  ConnectionHealthIssueType,
  ConnectionHealthResolutionReason,
  ConnectionType,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/notifications/dispatcher";

type DbClient = typeof prisma | Prisma.TransactionClient;
type Notify = typeof dispatchNotification;

interface ProviderDetails {
  providerCode?: unknown;
  providerSubcode?: unknown;
  providerType?: unknown;
  message?: unknown;
}

export interface ClassifiedConnectionAuthFailure {
  issueType: ConnectionHealthIssueType;
  providerCode: string | null;
  providerSubcode: string | null;
  providerType: string | null;
  providerMessage: string;
}

export interface RecordConnectionHealthFailureInput {
  connectionType: ConnectionType;
  connectionId: string;
  error: unknown;
  code?: string;
  detectedAt?: Date;
}

export interface ConnectionHealthAlertItem {
  id: string;
  creatorProfileId: string;
  creatorName: string;
  creatorEmail: string;
  connectionType: ConnectionType;
  connectionId: string;
  connectionLabel: string;
  issueType: ConnectionHealthIssueType;
  openedAt: string;
  lastDetectedAt: string;
  connectionHref: string;
  reconnectHref: string;
  creatorHref: string;
  providerDetails: {
    code: string | null;
    subcode: string | null;
    type: string | null;
    message: string | null;
  } | null;
}

export function classifyConnectionAuthFailure(
  error: unknown,
  code?: string,
): ClassifiedConnectionAuthFailure | null {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalizedCode = code?.toUpperCase() ?? "";
  const details = readProviderDetails(error);
  const providerCode = stringOrNull(details?.providerCode);
  const providerMessage =
    typeof details?.message === "string" && details.message
      ? details.message
      : message || "Authentication failed";

  let issueType: ConnectionHealthIssueType | null = null;
  if (
    normalizedCode === "MISSING_ACCOUNT_CREDENTIALS" ||
    normalizedCode === "NO_TOKEN" ||
    /\bmissing\b.{0,50}\b(token|credential|user id|page id)\b/i.test(message) ||
    /refresh token is missing/i.test(message)
  ) {
    issueType = "MISSING_TOKEN";
  } else if (
    normalizedCode === "TOKEN_EXPIRED" ||
    /access_token_expired|access token (has )?expired|token (has )?expired|session has expired/i.test(
      message,
    )
  ) {
    issueType = "TOKEN_EXPIRED";
  } else if (
    /invalid_grant|session (has been )?invalidated|\brevoked\b|not a confirmed user/i.test(
      message,
    )
  ) {
    issueType = "TOKEN_REVOKED";
  } else if (
    normalizedCode === "TOKEN_BROKEN" ||
    providerCode === "190" ||
    /access_token_invalid|invalid oauth access token|error validating access token|invalid token|oauthexception|invalid credentials|login required|autherror|\bunauthorized\b/i.test(
      message,
    )
  ) {
    issueType = "AUTH_INVALID";
  }

  if (!issueType) return null;

  return {
    issueType,
    providerCode: providerCode ?? readJsonField(message, "code"),
    providerSubcode:
      stringOrNull(details?.providerSubcode) ?? readJsonField(message, "error_subcode"),
    providerType:
      stringOrNull(details?.providerType) ?? readJsonField(message, "type"),
    providerMessage,
  };
}

export async function recordConnectionHealthFailure(
  input: RecordConnectionHealthFailureInput,
  db: DbClient = prisma,
  notify: Notify = dispatchNotification,
): Promise<{ incidentId: string; created: boolean } | null> {
  const failure = classifyConnectionAuthFailure(input.error, input.code);
  if (!failure) return null;

  const descriptor = await getConnectionDescriptor(
    input.connectionType,
    input.connectionId,
    db,
  );
  if (!descriptor) return null;

  const activeKey = connectionActiveKey(input.connectionType, input.connectionId);
  const detectedAt = input.detectedAt ?? new Date();
  const incidentData = {
    creatorProfileId: descriptor.creatorProfileId,
    connectionType: input.connectionType,
    connectionId: input.connectionId,
    connectionLabel: descriptor.label,
    issueType: failure.issueType,
    providerCode: failure.providerCode,
    providerSubcode: failure.providerSubcode,
    providerType: failure.providerType,
    providerMessage: failure.providerMessage,
    lastDetectedAt: detectedAt,
  };

  const existing = await db.connectionHealthIncident.findUnique({
    where: { activeKey },
    select: { id: true },
  });
  if (existing) {
    const incident = await db.connectionHealthIncident.update({
      where: { id: existing.id },
      data: incidentData,
      select: { id: true },
    });
    return { incidentId: incident.id, created: false };
  }

  let incident: { id: string };
  try {
    incident = await db.connectionHealthIncident.create({
      data: {
        ...incidentData,
        activeKey,
        openedAt: detectedAt,
      },
      select: { id: true },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const raced = await db.connectionHealthIncident.findUnique({
      where: { activeKey },
      select: { id: true },
    });
    if (!raced) throw error;
    incident = await db.connectionHealthIncident.update({
      where: { id: raced.id },
      data: incidentData,
      select: { id: true },
    });
    return { incidentId: incident.id, created: false };
  }

  try {
    await notify(descriptor.userId, "TOKEN_BROKEN", {
      incidentId: incident.id,
      connectionId: input.connectionId,
      connectionType: input.connectionType,
      accountLabel: descriptor.label,
      message: "Token expired. Please connect your page again.",
      href: connectionHref(input.connectionType, input.connectionId),
      occurredAt: detectedAt.toISOString(),
    });
  } catch (error) {
    console.error("[connection-health] notification failed", {
      incidentId: incident.id,
      error,
    });
  }

  return { incidentId: incident.id, created: true };
}

export async function resolveConnectionHealthIncident(
  connectionType: ConnectionType,
  connectionId: string,
  resolutionReason: ConnectionHealthResolutionReason,
  resolvedAt = new Date(),
  db: DbClient = prisma,
): Promise<void> {
  await db.connectionHealthIncident.updateMany({
    where: {
      activeKey: connectionActiveKey(connectionType, connectionId),
      resolvedAt: null,
    },
    data: {
      activeKey: null,
      resolvedAt,
      resolutionReason,
    },
  });
}

export async function resolveConnectionHealthIncidents(
  connectionType: ConnectionType,
  connectionIds: string[],
  resolutionReason: ConnectionHealthResolutionReason,
  resolvedAt = new Date(),
  db: DbClient = prisma,
): Promise<void> {
  if (connectionIds.length === 0) return;
  await db.connectionHealthIncident.updateMany({
    where: {
      activeKey: {
        in: connectionIds.map((connectionId) =>
          connectionActiveKey(connectionType, connectionId),
        ),
      },
      resolvedAt: null,
    },
    data: {
      activeKey: null,
      resolvedAt,
      resolutionReason,
    },
  });
}

export async function getConnectionHealthAlertsForViewer(
  viewer: { id: string; role: "creator" | "admin" },
  db: DbClient = prisma,
): Promise<ConnectionHealthAlertItem[]> {
  const incidents = await db.connectionHealthIncident.findMany({
    where:
      viewer.role === "creator"
        ? {
            resolvedAt: null,
            creatorProfile: { userId: viewer.id },
          }
        : { resolvedAt: null },
    orderBy: [{ openedAt: "desc" }, { lastDetectedAt: "desc" }],
    take: viewer.role === "admin" ? 100 : 20,
    select: {
      id: true,
      creatorProfileId: true,
      connectionType: true,
      connectionId: true,
      connectionLabel: true,
      issueType: true,
      providerCode: true,
      providerSubcode: true,
      providerType: true,
      providerMessage: true,
      openedAt: true,
      lastDetectedAt: true,
      creatorProfile: {
        select: {
          displayName: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  return incidents.map((incident) => ({
    id: incident.id,
    creatorProfileId: incident.creatorProfileId,
    creatorName: incident.creatorProfile.displayName,
    creatorEmail: incident.creatorProfile.user.email,
    connectionType: incident.connectionType,
    connectionId: incident.connectionId,
    connectionLabel: incident.connectionLabel,
    issueType: incident.issueType,
    openedAt: incident.openedAt.toISOString(),
    lastDetectedAt: incident.lastDetectedAt.toISOString(),
    connectionHref: connectionHref(
      incident.connectionType,
      incident.connectionId,
    ),
    reconnectHref: reconnectHref(incident.connectionType),
    creatorHref: `/admin/creators/${encodeURIComponent(incident.creatorProfileId)}?platform=${platformSlug(incident.connectionType)}&account=${encodeURIComponent(incident.connectionId)}`,
    providerDetails:
      viewer.role === "admin"
        ? {
            code: incident.providerCode,
            subcode: incident.providerSubcode,
            type: incident.providerType,
            message: incident.providerMessage,
          }
        : null,
  }));
}

export function connectionHref(
  connectionType: ConnectionType,
  connectionId: string,
): string {
  return `/creator/connections?platform=${platformSlug(connectionType)}&account=${encodeURIComponent(connectionId)}`;
}

export function reconnectHref(connectionType: ConnectionType): string {
  const route = {
    IG: "instagram",
    TT: "tiktok",
    YT: "youtube",
    FB: "facebook",
  }[connectionType];
  return `/api/auth/${route}?return_to=${encodeURIComponent("/creator/connections")}`;
}

function connectionActiveKey(
  connectionType: ConnectionType,
  connectionId: string,
): string {
  return `${connectionType}:${connectionId}`;
}

function platformSlug(connectionType: ConnectionType): string {
  return connectionType.toLowerCase();
}

async function getConnectionDescriptor(
  connectionType: ConnectionType,
  connectionId: string,
  db: DbClient,
): Promise<{
  creatorProfileId: string;
  userId: string;
  label: string;
} | null> {
  if (connectionType === "IG") {
    const connection = await db.creatorIgConnection.findUnique({
      where: { id: connectionId },
      select: {
        creatorProfileId: true,
        igUsername: true,
        creatorProfile: { select: { userId: true } },
      },
    });
    return connection
      ? {
          creatorProfileId: connection.creatorProfileId,
          userId: connection.creatorProfile.userId,
          label: `@${connection.igUsername.replace(/^@/, "")}`,
        }
      : null;
  }
  if (connectionType === "FB") {
    const connection = await db.creatorFbConnection.findUnique({
      where: { id: connectionId },
      select: {
        creatorProfileId: true,
        pageName: true,
        creatorProfile: { select: { userId: true } },
      },
    });
    return connection
      ? {
          creatorProfileId: connection.creatorProfileId,
          userId: connection.creatorProfile.userId,
          label: connection.pageName,
        }
      : null;
  }
  if (connectionType === "YT") {
    const connection = await db.creatorYtConnection.findUnique({
      where: { id: connectionId },
      select: {
        creatorProfileId: true,
        channelName: true,
        creatorProfile: { select: { userId: true } },
      },
    });
    return connection
      ? {
          creatorProfileId: connection.creatorProfileId,
          userId: connection.creatorProfile.userId,
          label: connection.channelName,
        }
      : null;
  }
  const connection = await db.creatorTikTokConnection.findUnique({
    where: { id: connectionId },
    select: {
      creatorProfileId: true,
      username: true,
      creatorProfile: { select: { userId: true } },
    },
  });
  return connection
    ? {
        creatorProfileId: connection.creatorProfileId,
        userId: connection.creatorProfile.userId,
        label: `@${connection.username.replace(/^@/, "")}`,
      }
    : null;
}

function readProviderDetails(error: unknown): ProviderDetails | null {
  if (!error || typeof error !== "object") return null;
  const details = (error as { details?: unknown }).details;
  return details && typeof details === "object"
    ? (details as ProviderDetails)
    : null;
}

function readJsonField(message: string, field: string): string | null {
  const pattern = new RegExp(`"${field}"\\s*:\\s*(?:"([^"]+)"|(-?\\d+))`, "i");
  const match = message.match(pattern);
  return match?.[1] ?? match?.[2] ?? null;
}

function stringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

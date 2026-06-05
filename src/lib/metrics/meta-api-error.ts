import type { MetricPollFailureReason } from "@prisma/client";

export interface MetaApiErrorDetails {
  httpStatus: number;
  providerCode: number | null;
  providerSubcode: number | null;
  providerType: string | null;
  message: string;
  raw: unknown;
}

export class MetaApiRequestError extends Error {
  readonly details: MetaApiErrorDetails;

  constructor(details: MetaApiErrorDetails) {
    super(details.message);
    this.name = "MetaApiRequestError";
    this.details = details;
  }
}

export function parseMetaApiError(
  httpStatus: number,
  body: string,
): MetaApiErrorDetails {
  const raw = safeJson(body);
  const provider = isRecord(raw) && isRecord(raw.error) ? raw.error : {};
  const fallbackMessage = body.slice(0, 500) || `Meta API returned ${httpStatus}`;

  return {
    httpStatus,
    providerCode: numberOrNull(provider.code),
    providerSubcode: numberOrNull(provider.error_subcode),
    providerType: typeof provider.type === "string" ? provider.type : null,
    message: typeof provider.message === "string" ? provider.message : fallbackMessage,
    raw: raw ?? { body: fallbackMessage },
  };
}

export function classifyMetaApiError(
  error: MetaApiErrorDetails,
): MetricPollFailureReason {
  const message = error.message.toLowerCase();

  if (
    error.httpStatus === 429 ||
    [4, 17, 32, 613].includes(error.providerCode ?? -1) ||
    message.includes("rate limit") ||
    message.includes("too many calls")
  ) {
    return "RATE_LIMITED";
  }

  if (
    error.httpStatus === 401 ||
    error.providerCode === 190 ||
    message.includes("invalid oauth access token") ||
    message.includes("access token has expired")
  ) {
    return "TOKEN_EXPIRED";
  }

  if (
    error.httpStatus === 403 ||
    [10, 200, 294, 299].includes(error.providerCode ?? -1) ||
    message.includes("permission")
  ) {
    return "PERMISSION_DENIED";
  }

  if (
    error.httpStatus === 404 ||
    message.includes("unsupported get request") ||
    message.includes("object does not exist") ||
    message.includes("cannot be loaded")
  ) {
    return "POST_NOT_FOUND";
  }

  if (
    error.providerCode === 100 &&
    (message.includes("nonexisting field") ||
      message.includes("invalid metric") ||
      message.includes("metric must be one of"))
  ) {
    return "API_SCHEMA_ERROR";
  }

  return "PLATFORM_ERROR";
}

export async function metaApiErrorFromResponse(
  response: Response,
): Promise<MetaApiRequestError> {
  const body = await response.text().catch(() => "");
  return new MetaApiRequestError(parseMetaApiError(response.status, body));
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

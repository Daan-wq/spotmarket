import { createHmac, timingSafeEqual } from "node:crypto";
import ipaddr from "ipaddr.js";
import type { BanIndicatorType } from "./risk-engine";

const HASH_VERSION = "v1";
const DEVICE_COOKIE_VERSION = "v1";
const CHALLENGE_PROOF_VERSION = "v1";
const CHALLENGE_PROOF_MAX_AGE_MS = 10 * 60 * 1000;

export const BAN_DEVICE_COOKIE = "clipprofit_device";
export const BAN_DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const BAN_CHALLENGE_COOKIE = "clipprofit_challenge";
export const BAN_CHALLENGE_COOKIE_MAX_AGE = 10 * 60;

function hmac(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function canonicalizeIp(value: string): string | null {
  try {
    const trimmed = value.trim();
    if (
      trimmed.includes(".") &&
      trimmed.split(".").some((part) => part.length > 1 && part.startsWith("0"))
    ) {
      return null;
    }
    return ipaddr.process(trimmed).toString();
  } catch {
    return null;
  }
}

export function getTrustedClientIp(
  request: Request,
  options: { isVercel?: boolean } = {},
): string | null {
  const isVercel = options.isVercel ?? process.env.VERCEL === "1";
  if (!isVercel) return null;

  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for");
  const candidate = forwarded?.split(",")[0]?.trim();
  return candidate ? canonicalizeIp(candidate) : null;
}

export function hashSignal(
  type: BanIndicatorType,
  value: string,
  secret = process.env.BAN_SIGNAL_HASH_SECRET ?? "",
): string {
  if (!secret) {
    throw new Error("BAN_SIGNAL_HASH_SECRET is not configured");
  }
  return `${HASH_VERSION}:${hmac(`${HASH_VERSION}:${type}:${value}`, secret)}`;
}

export function createDeviceCookieValue(
  deviceId: string,
  secret = process.env.BAN_SIGNAL_HASH_SECRET ?? "",
): string {
  if (!secret) {
    throw new Error("BAN_SIGNAL_HASH_SECRET is not configured");
  }
  const signature = hmac(
    `${DEVICE_COOKIE_VERSION}:device:${deviceId}`,
    secret,
  );
  return `${DEVICE_COOKIE_VERSION}.${deviceId}.${signature}`;
}

export function readDeviceCookieValue(
  value: string | undefined,
  secret = process.env.BAN_SIGNAL_HASH_SECRET ?? "",
): string | null {
  if (!value || !secret) return null;
  const [version, deviceId, signature, ...rest] = value.split(".");
  if (
    version !== DEVICE_COOKIE_VERSION ||
    !deviceId ||
    !signature ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    rest.length > 0
  ) {
    return null;
  }

  const expected = hmac(`${DEVICE_COOKIE_VERSION}:device:${deviceId}`, secret);
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }
  return deviceId;
}

export function createChallengeProofValue(
  issuedAt = new Date(),
  secret = process.env.BAN_SIGNAL_HASH_SECRET ?? "",
): string {
  if (!secret) {
    throw new Error("BAN_SIGNAL_HASH_SECRET is not configured");
  }
  const timestamp = issuedAt.getTime().toString();
  const signature = hmac(
    `${CHALLENGE_PROOF_VERSION}:challenge:${timestamp}`,
    secret,
  );
  return `${CHALLENGE_PROOF_VERSION}.${timestamp}.${signature}`;
}

export function readChallengeProofValue(
  value: string | undefined,
  now = new Date(),
  secret = process.env.BAN_SIGNAL_HASH_SECRET ?? "",
): boolean {
  if (!value || !secret) return false;
  const [version, timestamp, signature, ...rest] = value.split(".");
  if (
    version !== CHALLENGE_PROOF_VERSION ||
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    !signature ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    rest.length > 0
  ) {
    return false;
  }

  const issuedAt = Number(timestamp);
  const age = now.getTime() - issuedAt;
  if (age < 0 || age > CHALLENGE_PROOF_MAX_AGE_MS) return false;

  const expected = hmac(
    `${CHALLENGE_PROOF_VERSION}:challenge:${timestamp}`,
    secret,
  );
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex"),
  );
}

export function maskSignal(type: BanIndicatorType, value: string): string {
  if (type === "IP") {
    const parsed = canonicalizeIp(value);
    if (!parsed) return "unknown";
    if (parsed.includes(".")) {
      const octets = parsed.split(".");
      return `${octets.slice(0, 3).join(".")}.xxx`;
    }
    const groups = parsed.split(":").filter(Boolean);
    return `${groups.slice(0, 3).join(":")}::/48`;
  }

  if (value.length <= 8) return `${value.slice(0, 2)}...`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

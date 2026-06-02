import crypto from "node:crypto";

const INVITE_TTL_DAYS = 7;

export function normalizeBrandContactEmail(email: string) {
  return email.trim().toLowerCase();
}

export function createBrandInviteToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function hashBrandInviteToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function brandInviteExpiresAt(now = new Date()) {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

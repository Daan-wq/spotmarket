import { describe, expect, it } from "vitest";
import {
  brandInviteExpiresAt,
  createBrandInviteToken,
  hashBrandInviteToken,
  normalizeBrandContactEmail,
} from "@/lib/brand-invites";

describe("brand invite helpers", () => {
  it("normalizes brand contact email before persistence", () => {
    expect(normalizeBrandContactEmail("  OWNER@Example.COM ")).toBe("owner@example.com");
  });

  it("hashes invite tokens without exposing the raw token", () => {
    const token = createBrandInviteToken();
    const hash = hashBrandInviteToken(token);

    expect(token).toHaveLength(48);
    expect(hash).not.toBe(token);
    expect(hashBrandInviteToken(token)).toBe(hash);
  });

  it("sets invites to expire in seven days", () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    expect(brandInviteExpiresAt(now).toISOString()).toBe("2026-06-08T12:00:00.000Z");
  });
});

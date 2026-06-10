import { describe, expect, it } from "vitest";
import {
  canonicalizeIp,
  createChallengeProofValue,
  createDeviceCookieValue,
  getTrustedClientIp,
  hashSignal,
  maskSignal,
  readChallengeProofValue,
  readDeviceCookieValue,
} from "./signals";

describe("ban-evasion signals", () => {
  it("canonicalizes IPv4 and IPv6 addresses", () => {
    expect(canonicalizeIp("203.0.113.010")).toBeNull();
    expect(canonicalizeIp("203.0.113.10")).toBe("203.0.113.10");
    expect(canonicalizeIp("2001:0db8:0:0:0:0:0:1")).toBe("2001:db8::1");
  });

  it("uses Vercel's protected forwarding header instead of a spoofable fallback", () => {
    const request = new Request("https://app.test/sign-up", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.10",
        "x-forwarded-for": "198.51.100.50",
        "x-real-ip": "192.0.2.25",
      },
    });

    expect(getTrustedClientIp(request, { isVercel: true })).toBe("203.0.113.10");
    expect(getTrustedClientIp(request, { isVercel: false })).toBeNull();
  });

  it("hashes equal signals deterministically and separates signal types", () => {
    const ipHash = hashSignal("IP", "203.0.113.10", "secret");

    expect(ipHash).toBe(hashSignal("IP", "203.0.113.10", "secret"));
    expect(ipHash).not.toBe(hashSignal("DEVICE", "203.0.113.10", "secret"));
    expect(ipHash).toMatch(/^v1:[a-f0-9]{64}$/);
  });

  it("creates a signed device cookie and rejects tampering", () => {
    const cookie = createDeviceCookieValue("device-123", "secret");

    expect(readDeviceCookieValue(cookie, "secret")).toBe("device-123");
    expect(readDeviceCookieValue(`${cookie}x`, "secret")).toBeNull();
  });

  it("accepts a signed challenge proof for ten minutes only", () => {
    const issuedAt = new Date("2026-06-10T12:00:00.000Z");
    const proof = createChallengeProofValue(issuedAt, "secret");

    expect(
      readChallengeProofValue(
        proof,
        new Date("2026-06-10T12:09:59.000Z"),
        "secret",
      ),
    ).toBe(true);
    expect(
      readChallengeProofValue(
        proof,
        new Date("2026-06-10T12:10:01.000Z"),
        "secret",
      ),
    ).toBe(false);
  });

  it("masks identifiers without exposing their full value", () => {
    expect(maskSignal("IP", "203.0.113.10")).toBe("203.0.113.xxx");
    expect(maskSignal("DEVICE", "device-123456789")).toBe("devi...6789");
    expect(maskSignal("DISCORD", "123456789012345678")).toBe("1234...5678");
  });
});

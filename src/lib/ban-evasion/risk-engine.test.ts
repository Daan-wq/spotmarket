import { describe, expect, it } from "vitest";
import { evaluateBanRisk } from "./risk-engine";

const baseInput = {
  subjectRole: "creator" as const,
  accountBanned: false,
  matches: [],
  turnstilePassed: null,
  recentDistinctSignupCount: 0,
  mode: "enforce" as const,
};

describe("evaluateBanRisk", () => {
  it("blocks an actively banned creator even in observation mode", () => {
    expect(
      evaluateBanRisk({
        ...baseInput,
        accountBanned: true,
        mode: "observe",
      }),
    ).toMatchObject({
      decision: "BLOCK",
      observedDecision: "BLOCK",
      reasonCode: "ACCOUNT_BANNED",
    });
  });

  it("blocks a creator when a strong indicator matches", () => {
    expect(
      evaluateBanRisk({
        ...baseInput,
        matches: [{ type: "DEVICE", strength: "STRONG", mode: "LAYERED" }],
      }),
    ).toMatchObject({
      decision: "BLOCK",
      reasonCode: "STRONG_INDICATOR",
    });
  });

  it("only records a strong match while observation mode is active", () => {
    expect(
      evaluateBanRisk({
        ...baseInput,
        mode: "observe",
        matches: [{ type: "DISCORD", strength: "STRONG", mode: "LAYERED" }],
      }),
    ).toMatchObject({
      decision: "ALLOW",
      observedDecision: "BLOCK",
      reasonCode: "STRONG_INDICATOR",
    });
  });

  it("challenges an IP-only match", () => {
    expect(
      evaluateBanRisk({
        ...baseInput,
        matches: [{ type: "IP", strength: "WEAK", mode: "LAYERED" }],
      }),
    ).toMatchObject({
      decision: "CHALLENGE",
      reasonCode: "IP_REQUIRES_CHALLENGE",
    });
  });

  it("allows an IP-only match after successful Turnstile verification", () => {
    expect(
      evaluateBanRisk({
        ...baseInput,
        turnstilePassed: true,
        matches: [{ type: "IP", strength: "WEAK", mode: "LAYERED" }],
      }),
    ).toMatchObject({
      decision: "ALLOW",
      reasonCode: "IP_CHALLENGE_PASSED",
    });
  });

  it("blocks an IP match after failed Turnstile verification", () => {
    expect(
      evaluateBanRisk({
        ...baseInput,
        turnstilePassed: false,
        matches: [{ type: "IP", strength: "WEAK", mode: "LAYERED" }],
      }),
    ).toMatchObject({
      decision: "BLOCK",
      reasonCode: "IP_CHALLENGE_FAILED",
    });
  });

  it("blocks an IP match after three distinct creator signups in 24 hours", () => {
    expect(
      evaluateBanRisk({
        ...baseInput,
        recentDistinctSignupCount: 3,
        matches: [{ type: "IP", strength: "WEAK", mode: "LAYERED" }],
      }),
    ).toMatchObject({
      decision: "BLOCK",
      reasonCode: "IP_SIGNUP_VELOCITY",
    });
  });

  it("blocks a hard IP override without a second signal", () => {
    expect(
      evaluateBanRisk({
        ...baseInput,
        matches: [{ type: "IP", strength: "WEAK", mode: "HARD" }],
      }),
    ).toMatchObject({
      decision: "BLOCK",
      reasonCode: "HARD_IP",
    });
  });

  it("does not apply creator ban-evasion checks to admins or brands", () => {
    expect(
      evaluateBanRisk({
        ...baseInput,
        subjectRole: "admin",
        accountBanned: true,
        matches: [{ type: "DEVICE", strength: "STRONG", mode: "HARD" }],
      }),
    ).toMatchObject({
      decision: "ALLOW",
      observedDecision: "ALLOW",
      reasonCode: "OUT_OF_SCOPE",
    });
  });
});

import { describe, expect, it } from "vitest";
import { calculateReferralSplit, normalizeReferralCode } from "./referral";

describe("calculateReferralSplit", () => {
  it("returns the full creator amount with no referral fee when no referrer exists", () => {
    expect(calculateReferralSplit(125, null, new Date("2026-01-01"))).toEqual({
      creatorAmount: 125,
      referralFee: 0,
      referrerId: null,
    });
  });

  it("pays a 10 percent referral fee on top of creator earnings", () => {
    expect(calculateReferralSplit(250, "referrer-1", new Date("2026-01-01"))).toEqual({
      creatorAmount: 250,
      referralFee: 25,
      referrerId: "referrer-1",
    });
  });

  it("rounds the referral fee to cents", () => {
    expect(calculateReferralSplit(33.335, "referrer-1", new Date("2026-01-01")).referralFee).toBe(3.33);
  });

  it("caps referral fees at the remaining per-creator cap", () => {
    expect(calculateReferralSplit(500, "referrer-1", new Date("2026-01-01"), 95)).toEqual({
      creatorAmount: 500,
      referralFee: 5,
      referrerId: "referrer-1",
    });
  });

  it("does not pay once the per-creator cap is exhausted", () => {
    expect(calculateReferralSplit(500, "referrer-1", new Date("2026-01-01"), 100)).toEqual({
      creatorAmount: 500,
      referralFee: 0,
      referrerId: null,
    });
  });
});

describe("normalizeReferralCode", () => {
  it("trims and uppercases referral codes without removing punctuation", () => {
    expect(normalizeReferralCode(" qubgzdf- ")).toBe("QUBGZDF-");
  });

  it("returns undefined for blank values", () => {
    expect(normalizeReferralCode("   ")).toBeUndefined();
    expect(normalizeReferralCode(null)).toBeUndefined();
  });
});

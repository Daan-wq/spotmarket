import { describe, expect, it } from "vitest";
import {
  campaignAllowedConnectionTypes,
  campaignRequiresBioGate,
  checkBioKeywords,
  normalizeBioKeywords,
} from "./campaign-bio-gate";

describe("campaign bio gate helpers", () => {
  it("does not turn normal campaign approval into a bio requirement", () => {
    expect(campaignRequiresBioGate({ requiresApproval: true })).toBe(false);
  });

  it("deduplicates and trims configured keywords", () => {
    expect(normalizeBioKeywords([" BetSpecialist ", "", "betspecialist"])).toEqual([
      "BetSpecialist",
    ]);
  });

  it("matches all keywords with URL and case normalization", () => {
    expect(
      checkBioKeywords("Join via https://www.betspecialist.com/bonus today", [
        "BetSpecialist.com/bonus",
        "TODAY",
      ]),
    ).toEqual({ passed: true, missingKeywords: [] });
  });

  it("reports every missing keyword", () => {
    expect(checkBioKeywords("BetSpecialist", ["BetSpecialist", "clipprofit"])).toEqual({
      passed: false,
      missingKeywords: ["clipprofit"],
    });
  });

  it("only allows platform-matching connection types", () => {
    expect([...campaignAllowedConnectionTypes(["TIKTOK", "FACEBOOK"])]).toEqual(["TT", "FB"]);
    expect([...campaignAllowedConnectionTypes([])]).toEqual(["IG", "TT", "YT", "FB"]);
  });
});

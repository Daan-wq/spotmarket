import { describe, expect, it } from "vitest";
import { getCreatorAccountStatusCopy } from "./creator-account-status";

describe("getCreatorAccountStatusCopy", () => {
  it("reports no verified accounts without using profile verification wording", () => {
    expect(getCreatorAccountStatusCopy({})).toEqual({
      value: "No verified accounts",
      detail: "Connect a social account to join campaigns.",
    });
  });

  it("reports a single verified platform as campaign-ready", () => {
    expect(getCreatorAccountStatusCopy({ tiktok: true })).toEqual({
      value: "1 verified account",
      detail: "TikTok ready for campaigns.",
    });
  });

  it("reports multiple verified platforms without referring to bio verification", () => {
    const result = getCreatorAccountStatusCopy({
      instagram: true,
      youtube: true,
    });

    expect(result).toEqual({
      value: "2 verified accounts",
      detail: "Instagram and YouTube ready for campaigns.",
    });
    expect(result.detail).not.toMatch(/bio|profile verified/i);
  });
});

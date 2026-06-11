import { describe, expect, it } from "vitest";
import {
  audienceSharePercent,
  calculateAsianAudienceRisk,
  isAsianCountry,
} from "./audience-risk";

describe("audience risk", () => {
  it("normalizes fractional and percentage audience shares", () => {
    expect(audienceSharePercent(0.9)).toBe(90);
    expect(audienceSharePercent(90)).toBe(90);
  });

  it("awards four points for every Asian audience percentage point", () => {
    expect(
      calculateAsianAudienceRisk([
        { code: "IN", share: 0.9 },
        { code: "BD", share: 5 },
        { code: "NL", share: 0.05 },
      ]),
    ).toEqual({
      asianSharePercent: 95,
      riskPoints: 380,
      countries: [
        { code: "IN", sharePercent: 90, riskPoints: 360 },
        { code: "BD", sharePercent: 5, riskPoints: 20 },
      ],
    });
  });

  it("does not score countries outside Asia", () => {
    expect(isAsianCountry("NL")).toBe(false);
    expect(calculateAsianAudienceRisk([{ code: "NL", share: 1 }]).riskPoints).toBe(0);
  });
});

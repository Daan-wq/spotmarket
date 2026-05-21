import { describe, expect, it } from "vitest";
import { calculatePaidViews } from "./paid-views";

describe("calculatePaidViews", () => {
  it("does not pay below the campaign minimum", () => {
    expect(
      calculatePaidViews({
        rawViews: 200,
        minimumPaidViews: 5000,
        creatorCpv: 0.00045,
      }),
    ).toMatchObject({
      trackedViews: 200,
      payableViews: 0,
      eligibleViews: 0,
      earnedAmount: 0,
    });
  });

  it("pays all tracked views when the minimum is reached exactly", () => {
    expect(
      calculatePaidViews({
        rawViews: 5000,
        minimumPaidViews: 5000,
        creatorCpv: 0.01,
      }),
    ).toMatchObject({
      trackedViews: 5000,
      payableViews: 5000,
      earnedAmount: 50,
    });
  });

  it("pays all tracked views above the minimum", () => {
    expect(
      calculatePaidViews({
        rawViews: 7500,
        minimumPaidViews: 5000,
        creatorCpv: 0.01,
      }).earnedAmount,
    ).toBe(75);
  });

  it("caps payable views at the campaign maximum", () => {
    expect(
      calculatePaidViews({
        rawViews: 12_000,
        minimumPaidViews: 5000,
        maximumPaidViews: 8000,
        creatorCpv: 0.01,
      }),
    ).toMatchObject({
      trackedViews: 12_000,
      payableViews: 8000,
      earnedAmount: 80,
    });
  });

  it("subtracts baseline views before applying the threshold", () => {
    expect(
      calculatePaidViews({
        rawViews: 5200,
        baselineViews: 300,
        minimumPaidViews: 5000,
        creatorCpv: 0.01,
      }),
    ).toMatchObject({
      trackedViews: 4900,
      payableViews: 0,
      earnedAmount: 0,
    });
  });
});

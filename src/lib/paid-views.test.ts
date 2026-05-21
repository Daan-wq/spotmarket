import { describe, expect, it } from "vitest";
import { calculatePaidViews } from "./paid-views";

describe("calculatePaidViews", () => {
  it("pays zero when eligible views are below the minimum", () => {
    expect(
      calculatePaidViews({ rawViews: 1_999, minimumPaidViews: 2_000 }),
    ).toMatchObject({ eligibleViews: 1_999, payableViews: 0 });
  });

  it("pays all eligible views once the minimum is exactly met", () => {
    expect(
      calculatePaidViews({ rawViews: 2_000, minimumPaidViews: 2_000 }),
    ).toMatchObject({ eligibleViews: 2_000, payableViews: 2_000 });
  });

  it("pays all eligible views above the minimum when no maximum is set", () => {
    expect(
      calculatePaidViews({ rawViews: 3_500, minimumPaidViews: 2_000 }),
    ).toMatchObject({ eligibleViews: 3_500, payableViews: 3_500 });
  });

  it("caps payable views at the configured maximum", () => {
    expect(
      calculatePaidViews({
        rawViews: 12_000,
        minimumPaidViews: 2_000,
        maximumPaidViews: 10_000,
      }),
    ).toMatchObject({ eligibleViews: 12_000, payableViews: 10_000 });
  });

  it("pays all eligible views when the maximum is blank", () => {
    expect(
      calculatePaidViews({
        rawViews: 12_000,
        minimumPaidViews: 2_000,
        maximumPaidViews: null,
      }),
    ).toMatchObject({ eligibleViews: 12_000, payableViews: 12_000 });
  });

  it("subtracts baseline views before applying thresholds", () => {
    expect(
      calculatePaidViews({
        rawViews: 5_000,
        baselineViews: 3_500,
        minimumPaidViews: 2_000,
      }),
    ).toMatchObject({ eligibleViews: 1_500, payableViews: 0 });
  });
});

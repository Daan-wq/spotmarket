import { describe, expect, it } from "vitest";
import {
  getMobilePanelBottom,
  getSpotlightBounds,
  type TargetRect,
} from "./first-clip-spotlight";

const targetRect: TargetRect = {
  top: 100,
  left: 24,
  right: 124,
  bottom: 150,
  width: 100,
  height: 50,
};

describe("getSpotlightBounds", () => {
  it("adds padding around a target", () => {
    expect(getSpotlightBounds(targetRect, 390, 844)).toEqual({
      top: 92,
      left: 16,
      right: 132,
      bottom: 158,
      width: 116,
      height: 66,
    });
  });

  it("clamps the interaction hole to the viewport", () => {
    expect(
      getSpotlightBounds(
        {
          top: -10,
          left: -20,
          right: 410,
          bottom: 860,
          width: 430,
          height: 870,
        },
        390,
        844,
      ),
    ).toEqual({
      top: 0,
      left: 0,
      right: 390,
      bottom: 844,
      width: 390,
      height: 844,
    });
  });
});

describe("getMobilePanelBottom", () => {
  it("keeps the sheet at the safe bottom position for normal targets", () => {
    expect(getMobilePanelBottom(targetRect, 844)).toBe(12);
  });

  it("raises the sheet above a highlighted bottom navigation target", () => {
    expect(
      getMobilePanelBottom(
        {
          top: 775,
          left: 12,
          right: 378,
          bottom: 831,
          width: 366,
          height: 56,
        },
        844,
      ),
    ).toBe(81);
  });
});

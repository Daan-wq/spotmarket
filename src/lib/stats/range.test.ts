import { describe, expect, it } from "vitest";
import { parseRange, rangeFor, withinRange, withinPrevRange, pctDelta } from "./range";

describe("parseRange", () => {
  it("defaults to 30d when not provided", () => {
    const r = parseRange({});
    expect(r.key).toBe("30d");
    expect(r.start).not.toBeNull();
  });

  it("respects 7d / 90d", () => {
    expect(parseRange({ range: "7d" }).key).toBe("7d");
    expect(parseRange({ range: "90d" }).key).toBe("90d");
  });

  it("uses 'all' to return null start", () => {
    const r = parseRange({ range: "all" });
    expect(r.key).toBe("all");
    expect(r.start).toBeNull();
    expect(r.prevStart).toBeNull();
  });

  it("falls back to 30d on garbage input", () => {
    expect(parseRange({ range: "foo" }).key).toBe("30d");
  });

  it("works with URLSearchParams", () => {
    const sp = new URLSearchParams({ range: "7d" });
    expect(parseRange(sp).key).toBe("7d");
  });

  it("array values pick the first element", () => {
    expect(parseRange({ range: ["7d"] as unknown as string }).key).toBe("7d");
  });
});

describe("rangeFor", () => {
  it("computes prev window for 30d as the prior 30 days", () => {
    const r = rangeFor("30d");
    expect(r.prevStart).not.toBeNull();
    expect(r.prevEnd).not.toBeNull();
    const days = (r.start!.getTime() - r.prevStart!.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBeCloseTo(30, 0);
  });
});

describe("withinRange / withinPrevRange", () => {
  it("returns gte/lte for non-all ranges", () => {
    const r = rangeFor("7d");
    const cap = withinRange(r);
    expect(cap.gte).toBeInstanceOf(Date);
    expect(cap.lte).toBeInstanceOf(Date);
  });

  it("returns empty object for 'all'", () => {
    const r = rangeFor("all");
    expect(withinRange(r)).toEqual({});
    expect(withinPrevRange(r)).toBeNull();
  });
});

describe("pctDelta", () => {
  it("returns null when prior is 0 and current is non-zero", () => {
    expect(pctDelta(10, 0)).toBeNull();
  });

  it("returns 0 when both are 0", () => {
    expect(pctDelta(0, 0)).toBe(0);
  });

  it("returns positive percentage for growth", () => {
    expect(pctDelta(150, 100)).toBeCloseTo(50, 5);
  });

  it("returns negative percentage for decline", () => {
    expect(pctDelta(50, 100)).toBeCloseTo(-50, 5);
  });
});

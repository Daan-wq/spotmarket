import { describe, expect, it } from "vitest";
import {
  isValidMetricSnapshot,
  VALID_METRIC_SNAPSHOT_WHERE,
} from "./valid-snapshots";

describe("valid metric snapshots", () => {
  it("excludes historical OAuth failure rows from latest-metric consumers", () => {
    expect(VALID_METRIC_SNAPSHOT_WHERE).toEqual({
      source: { not: "OAUTH_FAILED" },
    });
    expect(isValidMetricSnapshot({ source: "OAUTH_IG" })).toBe(true);
    expect(isValidMetricSnapshot({ source: "OAUTH_FAILED" })).toBe(false);
  });
});

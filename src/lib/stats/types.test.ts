import { describe, expect, it } from "vitest";
import {
  isPlatformSlug,
  metricSourceToSlug,
  slugToConnectionType,
  connectionTypeToSlug,
  PLATFORM_ALL,
} from "./types";

describe("PlatformSlug helpers", () => {
  it("isPlatformSlug accepts only known slugs", () => {
    expect(isPlatformSlug("ig")).toBe(true);
    expect(isPlatformSlug("tt")).toBe(true);
    expect(isPlatformSlug("yt")).toBe(true);
    expect(isPlatformSlug("fb")).toBe(true);
    expect(isPlatformSlug("xx")).toBe(false);
    expect(isPlatformSlug(undefined)).toBe(false);
  });

  it("metricSourceToSlug maps OAUTH_* to slug", () => {
    expect(metricSourceToSlug("OAUTH_IG")).toBe("ig");
    expect(metricSourceToSlug("OAUTH_TT")).toBe("tt");
    expect(metricSourceToSlug("OAUTH_YT")).toBe("yt");
    expect(metricSourceToSlug("OAUTH_FB")).toBe("fb");
    expect(metricSourceToSlug("OAUTH_FAILED")).toBeNull();
    expect(metricSourceToSlug("FOO")).toBeNull();
  });

  it("slug ↔ ConnectionType is reversible", () => {
    for (const slug of PLATFORM_ALL) {
      const round = connectionTypeToSlug(slugToConnectionType(slug));
      expect(round).toBe(slug);
    }
  });
});

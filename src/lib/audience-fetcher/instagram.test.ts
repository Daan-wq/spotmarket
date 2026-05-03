import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatorIgConnection } from "@prisma/client";

const fetchDemographicSnapshotsMock = vi.fn();
const decryptMock = vi.fn();

vi.mock("@/lib/instagram", () => ({
  fetchDemographicSnapshots: (...args: unknown[]) => fetchDemographicSnapshotsMock(...args),
}));
vi.mock("@/lib/crypto", () => ({
  decrypt: (...args: unknown[]) => decryptMock(...args),
}));

import { fetchIgAudience } from "./instagram";

function conn(): CreatorIgConnection {
  return {
    id: "conn_1",
    accessToken: "ciphertext",
    accessTokenIv: "iv",
    igUserId: "ig_user_1",
  } as unknown as CreatorIgConnection;
}

beforeEach(() => {
  fetchDemographicSnapshotsMock.mockReset();
  decryptMock.mockReset();
  decryptMock.mockReturnValue("decoded-token");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchIgAudience", () => {
  it("emits separate FOLLOWER and ENGAGED variants when both are returned", async () => {
    fetchDemographicSnapshotsMock.mockResolvedValue({
      rows: [
        { demographicType: "FOLLOWER", breakdownKey: "country", breakdownValue: "US", value: 60 },
        { demographicType: "FOLLOWER", breakdownKey: "country", breakdownValue: "GB", value: 40 },
        { demographicType: "FOLLOWER", breakdownKey: "gender", breakdownValue: "F", value: 70 },
        { demographicType: "FOLLOWER", breakdownKey: "gender", breakdownValue: "M", value: 30 },
        { demographicType: "FOLLOWER", breakdownKey: "age", breakdownValue: "18-24", value: 50 },
        { demographicType: "FOLLOWER", breakdownKey: "age", breakdownValue: "25-34", value: 50 },
        { demographicType: "FOLLOWER", breakdownKey: "city", breakdownValue: "Amsterdam", value: 25 },
        { demographicType: "FOLLOWER", breakdownKey: "city", breakdownValue: "Berlin", value: 75 },

        { demographicType: "ENGAGED", breakdownKey: "country", breakdownValue: "US", value: 80 },
        { demographicType: "ENGAGED", breakdownKey: "country", breakdownValue: "FR", value: 20 },
        { demographicType: "ENGAGED", breakdownKey: "gender", breakdownValue: "F", value: 50 },
        { demographicType: "ENGAGED", breakdownKey: "gender", breakdownValue: "M", value: 50 },
        { demographicType: "ENGAGED", breakdownKey: "age", breakdownValue: "18-24", value: 80 },
        { demographicType: "ENGAGED", breakdownKey: "age", breakdownValue: "25-34", value: 20 },
      ],
      legacyJson: { countries: {}, genders: {}, ages: {}, cities: {} },
    });

    const r = await fetchIgAudience(conn());
    expect(r.ok).toBe(true);
    expect(r.variants).toBeDefined();
    expect(r.variants).toHaveLength(2);

    const follower = r.variants!.find((v) => v.kind === "FOLLOWER")!;
    expect(follower.audience.topCountries[0]).toEqual({ code: "US", share: 0.6 });
    expect(follower.audience.genderSplit.female).toBeCloseTo(0.7);
    expect(follower.audience.cities).toEqual({ Berlin: 0.75, Amsterdam: 0.25 });

    const engaged = r.variants!.find((v) => v.kind === "ENGAGED")!;
    // Different from follower: US is 80% engaged, not 60%
    expect(engaged.audience.topCountries[0]).toEqual({ code: "US", share: 0.8 });
    expect(engaged.audience.genderSplit.female).toBeCloseTo(0.5);

    // backward-compat: result.audience should be the FOLLOWER variant
    expect(r.audience).toEqual(follower.audience);
  });

  it("returns only FOLLOWER when ENGAGED rows are empty", async () => {
    fetchDemographicSnapshotsMock.mockResolvedValue({
      rows: [
        { demographicType: "FOLLOWER", breakdownKey: "country", breakdownValue: "NL", value: 100 },
        { demographicType: "FOLLOWER", breakdownKey: "gender", breakdownValue: "F", value: 100 },
      ],
      legacyJson: { countries: {}, genders: {}, ages: {}, cities: {} },
    });

    const r = await fetchIgAudience(conn());
    expect(r.ok).toBe(true);
    expect(r.variants).toHaveLength(1);
    expect(r.variants![0].kind).toBe("FOLLOWER");
  });

  it("returns ok:false with reason when no rows are returned", async () => {
    fetchDemographicSnapshotsMock.mockResolvedValue({
      rows: [],
      legacyJson: { countries: {}, genders: {}, ages: {}, cities: {} },
    });

    const r = await fetchIgAudience(conn());
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/no demographic data/i);
  });

  it("flags tokenBroken on OAuth error", async () => {
    fetchDemographicSnapshotsMock.mockRejectedValue(new Error("OAuthException: token expired"));
    const r = await fetchIgAudience(conn());
    expect(r.ok).toBe(false);
    expect(r.tokenBroken).toBe(true);
  });
});

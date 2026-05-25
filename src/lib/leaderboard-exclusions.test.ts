import { describe, expect, it } from "vitest";
import { isExcludedFromLeaderboards } from "./leaderboard-exclusions";

describe("isExcludedFromLeaderboards", () => {
  it("excludes the daans03 test account by Discord username", () => {
    expect(
      isExcludedFromLeaderboards({
        email: "daan0529@icloud.com",
        discordUsername: "daans03",
        creatorProfile: { username: null },
      }),
    ).toBe(true);
  });

  it("normalizes profile usernames and email local parts", () => {
    expect(
      isExcludedFromLeaderboards({
        email: "creator@example.com",
        discordUsername: null,
        creatorProfile: { username: "@DAANS03" },
      }),
    ).toBe(true);
    expect(isExcludedFromLeaderboards({ email: "daans03@example.com" })).toBe(true);
  });

  it("keeps regular creators visible", () => {
    expect(
      isExcludedFromLeaderboards({
        email: "creator@example.com",
        discordUsername: "real_creator",
        creatorProfile: { username: "profile_creator" },
      }),
    ).toBe(false);
  });
});

import { describe, expect, test } from "vitest";
import { resolveCreatorLeaderboardName } from "./creator-leaderboard-name";

describe("resolveCreatorLeaderboardName", () => {
  test("prefers discord username over profile username and email", () => {
    expect(
      resolveCreatorLeaderboardName({
        discordUsername: "discord_user",
        email: "creator@example.com",
        creatorProfile: { username: "profile_user" },
      }),
    ).toBe("discord_user");
  });

  test("falls back to profile username before email", () => {
    expect(
      resolveCreatorLeaderboardName({
        discordUsername: null,
        email: "creator@example.com",
        creatorProfile: { username: "profile_user" },
      }),
    ).toBe("profile_user");
  });

  test("uses email when discord and profile username are missing", () => {
    expect(
      resolveCreatorLeaderboardName({
        discordUsername: " ",
        email: "creator@example.com",
        creatorProfile: { username: "" },
      }),
    ).toBe("creator@example.com");
  });

  test("returns null instead of a generic creator label", () => {
    expect(resolveCreatorLeaderboardName(null)).toBeNull();
  });
});

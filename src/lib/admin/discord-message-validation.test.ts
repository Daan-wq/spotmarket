import { describe, expect, it } from "vitest";
import {
  DISCORD_MAX_REQUEST_BYTES,
  getDiscordMessageValidationIssues,
  validateDiscordMessageInput,
} from "./discord-message-validation";

describe("Discord message validation", () => {
  it("returns the exact local blockers instead of a generic disabled state", () => {
    expect(
      getDiscordMessageValidationIssues({
        channelId: "",
        content: "",
        files: [],
      }),
    ).toEqual([
      { code: "missing_channel", message: "Choose a Discord channel." },
      { code: "missing_payload", message: "Add message content or at least one file." },
    ]);
  });

  it("validates selected channels against the live channel list", () => {
    expect(
      validateDiscordMessageInput({
        channelId: "old-channel",
        content: "Hello",
        files: [],
        validChannelIds: ["channel-1"],
      }),
    ).toBe("Choose a valid Discord channel.");
  });

  it("allows attachment-only messages with a valid channel", () => {
    expect(
      validateDiscordMessageInput({
        channelId: "channel-1",
        content: "",
        files: [{ size: 12 }],
        validChannelIds: ["channel-1"],
      }),
    ).toBeNull();
  });

  it("keeps Discord limits explicit", () => {
    expect(
      getDiscordMessageValidationIssues({
        channelId: "channel-1",
        content: "x".repeat(2001),
        files: Array.from({ length: 11 }, () => ({ size: DISCORD_MAX_REQUEST_BYTES })),
        validChannelIds: ["channel-1"],
      }).map((issue) => issue.code),
    ).toEqual(["content_too_long", "too_many_files", "request_too_large"]);
  });
});

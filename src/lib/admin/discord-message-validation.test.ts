import { describe, expect, it } from "vitest";
import {
  DISCORD_MAX_REQUEST_BYTES,
  buildDiscordButtonComponents,
  getDiscordMessageValidationIssues,
  normalizeDiscordEmbeds,
  normalizeDiscordLinkButtons,
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
      { code: "missing_payload", message: "Add message content, an embed, a file, or a URL button." },
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

  it("allows URL-button-only messages with a valid channel", () => {
    expect(
      validateDiscordMessageInput({
        channelId: "channel-1",
        content: "",
        files: [],
        buttons: [{ label: "Open campaign", url: "https://clipprofit.com/campaigns/1" }],
        validChannelIds: ["channel-1"],
      }),
    ).toBeNull();
  });

  it("allows embed-only messages with a valid channel", () => {
    expect(
      validateDiscordMessageInput({
        channelId: "channel-1",
        content: "",
        files: [],
        embeds: [{ title: "Rules", description: "Respect each other.", color: 0x5865f2 }],
        validChannelIds: ["channel-1"],
      }),
    ).toBeNull();
  });

  it("allows uploaded embed images through attachment URLs when the file is present", () => {
    expect(
      validateDiscordMessageInput({
        channelId: "channel-1",
        content: "",
        files: [{ name: "embed-1-image-launch.png", size: 512 }],
        embeds: [{ title: "Launch", imageUrl: "attachment://embed-1-image-launch.png" }],
        validChannelIds: ["channel-1"],
      }),
    ).toBeNull();

    expect(
      getDiscordMessageValidationIssues({
        channelId: "channel-1",
        content: "",
        files: [],
        embeds: [{ title: "Launch", imageUrl: "attachment://embed-1-image-launch.png" }],
        validChannelIds: ["channel-1"],
      }).map((issue) => issue.message),
    ).toContain("Embed 1 image URL upload is missing. Re-upload the image before sending.");
  });

  it("normalizes embeds by removing empty optional objects", () => {
    expect(
      normalizeDiscordEmbeds([
        {
          title: " Rules ",
          url: " https://clipprofit.com ",
          description: " Be kind ",
          color: 0x5865f2,
          authorName: "",
          authorIconUrl: "",
          footerText: " ClipProfit ",
          footerIconUrl: "",
          imageUrl: "",
          thumbnailUrl: "",
          timestamp: false,
          fields: [
            { name: " Rule 1 ", value: " Respect ", inline: true },
            { name: "", value: "", inline: false },
          ],
        },
      ]),
    ).toEqual([
      {
        title: "Rules",
        url: "https://clipprofit.com",
        description: "Be kind",
        color: 0x5865f2,
        fields: [{ name: "Rule 1", value: "Respect", inline: true }],
        footer: { text: "ClipProfit" },
      },
    ]);
  });

  it("validates Discord embed limits", () => {
    expect(
      getDiscordMessageValidationIssues({
        channelId: "channel-1",
        content: "",
        files: [],
        embeds: [
          {
            title: "x".repeat(257),
            description: "x".repeat(4097),
            fields: [{ name: "Name", value: "", inline: false }],
          },
        ],
        validChannelIds: ["channel-1"],
      }).map((issue) => issue.message),
    ).toEqual([
      "Embed 1 title must be 256 characters or fewer.",
      "Embed 1 description must be 4096 characters or fewer.",
      "Embed 1 field 1 needs both name and value.",
    ]);
  });

  it("validates URL button label and URL rules", () => {
    expect(
      getDiscordMessageValidationIssues({
        channelId: "channel-1",
        content: "Hello",
        files: [],
        buttons: [
          { label: "Missing URL", url: "" },
          { label: "Bad protocol", url: "javascript:alert(1)" },
          { label: "x".repeat(81), url: "https://clipprofit.com" },
        ],
        validChannelIds: ["channel-1"],
      }).map((issue) => issue.message),
    ).toEqual([
      "Button 1 needs both a label and URL.",
      "Button 2 URL must start with http:// or https://.",
      "Button 3 label must be 80 characters or fewer.",
    ]);
  });

  it("normalizes and builds Discord action rows for URL buttons", () => {
    const buttons = normalizeDiscordLinkButtons([
      { label: "  Open  ", url: " https://clipprofit.com " },
      { label: "", url: "" },
      { label: "Docs", url: "https://docs.discord.com" },
    ]);

    expect(buttons).toEqual([
      { label: "Open", url: "https://clipprofit.com" },
      { label: "Docs", url: "https://docs.discord.com" },
    ]);
    expect(buildDiscordButtonComponents(buttons)).toEqual([
      {
        type: 1,
        components: [
          { type: 2, style: 5, label: "Open", url: "https://clipprofit.com" },
          { type: 2, style: 5, label: "Docs", url: "https://docs.discord.com" },
        ],
      },
    ]);
  });

  it("keeps Discord limits explicit", () => {
    expect(
      getDiscordMessageValidationIssues({
        channelId: "channel-1",
        content: "x".repeat(2001),
        files: Array.from({ length: 11 }, () => ({ size: DISCORD_MAX_REQUEST_BYTES })),
        buttons: Array.from({ length: 26 }, (_, index) => ({
          label: `Button ${index + 1}`,
          url: "https://clipprofit.com",
        })),
        validChannelIds: ["channel-1"],
      }).map((issue) => issue.code),
    ).toEqual(["content_too_long", "too_many_files", "request_too_large", "too_many_buttons"]);
  });
});

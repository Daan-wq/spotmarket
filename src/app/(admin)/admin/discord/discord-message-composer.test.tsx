import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DiscordMessageComposer, shouldPatchLoadedDiscordTemplate } from "./discord-message-composer";

describe("DiscordMessageComposer", () => {
  it("keeps preview/send clickable so validation can show a useful error", () => {
    const html = renderToStaticMarkup(<DiscordMessageComposer />);
    const sendButton = html
      .match(/<button\b[^>]*>[\s\S]*?<\/button>/g)
      ?.find((button) => button.includes("Preview and send"));

    expect(sendButton).toBeTruthy();
    expect(sendButton).not.toContain("disabled=\"\"");
    expect(html).toContain("Discord channels and emojis are still loading.");
  });

  it("only patches a loaded template when the saved name and kind still match", () => {
    const loaded = { id: "tpl-1", name: "Campaign Launch", kind: "TEMPLATE" as const };

    expect(shouldPatchLoadedDiscordTemplate(loaded, " campaign launch ", "TEMPLATE")).toBe(true);
    expect(shouldPatchLoadedDiscordTemplate(loaded, "Campaign Launch v2", "TEMPLATE")).toBe(false);
    expect(shouldPatchLoadedDiscordTemplate(loaded, "Campaign Launch", "DRAFT")).toBe(false);
    expect(shouldPatchLoadedDiscordTemplate(null, "Campaign Launch", "TEMPLATE")).toBe(false);
  });
});

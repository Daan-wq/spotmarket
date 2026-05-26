import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DiscordMessageComposer } from "./discord-message-composer";

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
});

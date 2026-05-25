import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DiscordMarkdownPreview } from "./discord-markdown-preview";

const emojis = [
  {
    id: "123",
    name: "clipprofit",
    animated: false,
    available: true,
    url: "https://cdn.discordapp.com/emojis/123.png",
    syntax: "<:clipprofit:123>",
  },
];

describe("DiscordMarkdownPreview", () => {
  it("renders Discord markdown as safe React markup", () => {
    const html = renderToStaticMarkup(
      <DiscordMarkdownPreview
        content={"**Launch**\n- first\n> quote\n`code`\n||spoiler||"}
        emojis={emojis}
      />,
    );

    expect(html).toContain("<strong");
    expect(html).toContain("Launch");
    expect(html).toContain("<ul");
    expect(html).toContain("<blockquote");
    expect(html).toContain("<code");
    expect(html).toContain("spoiler");
  });

  it("replaces known custom emojis and leaves unknown syntax as text", () => {
    const html = renderToStaticMarkup(
      <DiscordMarkdownPreview
        content={"Ship it <:clipprofit:123> <:unknown:999>"}
        emojis={emojis}
      />,
    );

    expect(html).toContain("https://cdn.discordapp.com/emojis/123.png");
    expect(html).toContain('alt=":clipprofit:"');
    expect(html).toContain("&lt;:unknown:999&gt;");
  });
});

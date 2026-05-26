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

  it("renders Discord headers, subtext, code fence language, and multiline quotes", () => {
    const html = renderToStaticMarkup(
      <DiscordMarkdownPreview
        content={[
          "# Big header",
          "## Medium header",
          "### Small header",
          "-# Subtext / small grey text",
          "```js",
          'console.log("Hello");',
          "```",
          ">>> multi-line quote",
          "This keeps quoting everything after it.",
        ].join("\n")}
        emojis={emojis}
      />,
    );

    expect(html).toContain("<h1");
    expect(html).toContain("<h2");
    expect(html).toContain("<h3");
    expect(html).toContain("Subtext / small grey text");
    expect(html).toContain("js");
    expect(html).toContain("console.log");
    expect(html).toContain("<blockquote");
    expect(html).toContain("This keeps quoting everything after it.");
  });

  it("renders nested Discord emphasis and escaped markdown", () => {
    const html = renderToStaticMarkup(
      <DiscordMarkdownPreview
        content={[
          "***bold italic***",
          "__*underlined italic*__",
          "__**underlined bold**__",
          "__***underlined bold italic***__",
          "\\*\\*escaped markdown, not bold\\*\\*",
        ].join("\n")}
        emojis={emojis}
      />,
    );

    expect(html).toContain("<strong><em>bold italic</em></strong>");
    expect(html).toContain("<u><em>underlined italic</em></u>");
    expect(html).toContain("<u><strong>underlined bold</strong></u>");
    expect(html).toContain("<u><strong><em>underlined bold italic</em></strong></u>");
    expect(html).toContain("**escaped markdown, not bold**");
    expect(html).not.toContain("<strong>escaped markdown");
  });

  it("renders masked links, normal urls, and indented lists", () => {
    const html = renderToStaticMarkup(
      <DiscordMarkdownPreview
        content={[
          "[text shown](https://example.com)",
          "https://clipprofit.com",
          "- bullet list",
          "  - indented bullet",
          "1. numbered list",
          "  2. indented numbered list",
        ].join("\n")}
        emojis={emojis}
      />,
    );

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("text shown");
    expect(html).toContain('href="https://clipprofit.com"');
    expect(html).toContain("<ul");
    expect(html).toContain("<ol");
    expect(html).toContain("indented bullet");
    expect(html).toContain("indented numbered list");
  });

  it("can render the preview inside a mobile frame", () => {
    const html = renderToStaticMarkup(
      <DiscordMarkdownPreview content="Mobile preview" emojis={emojis} frame="mobile" />,
    );

    expect(html).toContain("Discord mobile preview");
    expect(html).toContain("Mobile preview");
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

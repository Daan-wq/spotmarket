import { describe, expect, it } from "vitest";
import {
  escapeDiscordMarkdown,
  formatId,
  toggleBlockFormat,
  toggleInlineFormat,
  toggleLinePrefix,
} from "./discord-editor-formatting";

describe("discord editor formatting helpers", () => {
  it("wraps and unwraps selected inline formatting", () => {
    const wrapped = toggleInlineFormat({
      content: "Launch",
      selection: { start: 0, end: 6 },
      prefix: "**",
      suffix: "**",
      fallback: "text",
      activeInlineFormat: null,
    });

    expect(wrapped.content).toBe("**Launch**");
    expect(wrapped.selection).toEqual({ start: 2, end: 8 });
    expect(wrapped.activeInlineFormat).toBeNull();

    const unwrapped = toggleInlineFormat({
      content: wrapped.content,
      selection: wrapped.selection,
      prefix: "**",
      suffix: "**",
      fallback: "text",
      activeInlineFormat: null,
    });

    expect(unwrapped.content).toBe("Launch");
    expect(unwrapped.selection).toEqual({ start: 0, end: 6 });
  });

  it("opens and closes inline markers when no text is selected", () => {
    const opened = toggleInlineFormat({
      content: "Hello ",
      selection: { start: 6, end: 6 },
      prefix: "__",
      suffix: "__",
      fallback: "text",
      activeInlineFormat: null,
    });

    expect(opened.content).toBe("Hello __");
    expect(opened.selection).toEqual({ start: 8, end: 8 });
    expect(opened.activeInlineFormat).toBe(formatId("__", "__"));

    const closed = toggleInlineFormat({
      content: "Hello __world",
      selection: { start: 13, end: 13 },
      prefix: "__",
      suffix: "__",
      fallback: "text",
      activeInlineFormat: opened.activeInlineFormat,
    });

    expect(closed.content).toBe("Hello __world__");
    expect(closed.selection).toEqual({ start: 15, end: 15 });
    expect(closed.activeInlineFormat).toBeNull();
  });

  it("toggles line prefixes on selected lines", () => {
    const listed = toggleLinePrefix({
      content: "first\nsecond",
      selection: { start: 0, end: "first\nsecond".length },
      prefix: "- ",
    });

    expect(listed.content).toBe("- first\n- second");

    const plain = toggleLinePrefix({
      content: listed.content,
      selection: { start: 0, end: listed.content.length },
      prefix: "- ",
    });

    expect(plain.content).toBe("first\nsecond");
  });

  it("inserts a line prefix on an empty current line", () => {
    const result = toggleLinePrefix({
      content: "",
      selection: { start: 0, end: 0 },
      prefix: "# ",
    });

    expect(result.content).toBe("# ");
    expect(result.selection).toEqual({ start: 0, end: 2 });
  });

  it("replaces conflicting line prefixes instead of treating them as the active toggle", () => {
    const result = toggleLinePrefix({
      content: "## Medium",
      selection: { start: 0, end: 0 },
      prefix: "# ",
      removePattern: /^#{1,3}\s+/,
    });

    expect(result.content).toBe("# Medium");
  });

  it("wraps and unwraps code blocks", () => {
    const wrapped = toggleBlockFormat({
      content: "console.log(1);",
      selection: { start: 0, end: "console.log(1);".length },
      prefix: "```js\n",
      suffix: "\n```",
      fallback: "// code",
    });

    expect(wrapped.content).toBe("```js\nconsole.log(1);\n```");

    const unwrapped = toggleBlockFormat({
      content: wrapped.content,
      selection: { start: 0, end: wrapped.content.length },
      prefix: "```js\n",
      suffix: "\n```",
      fallback: "// code",
    });

    expect(unwrapped.content).toBe("console.log(1);");
  });

  it("escapes Discord markdown markers", () => {
    expect(escapeDiscordMarkdown("**escaped markdown, not bold**")).toBe("\\*\\*escaped markdown, not bold\\*\\*");
  });
});

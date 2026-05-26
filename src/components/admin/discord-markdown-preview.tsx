/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import type { DiscordEmoji } from "@/lib/admin/discord";
import { cn } from "@/lib/cn";

interface DiscordMarkdownPreviewProps {
  content: string;
  emojis: DiscordEmoji[];
  className?: string;
  frame?: "default" | "mobile";
}

interface ListItem {
  text: string;
  depth: number;
}

type Block =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "subtext"; text: string }
  | { kind: "quote"; lines: string[] }
  | { kind: "ulist"; items: ListItem[] }
  | { kind: "olist"; items: ListItem[] }
  | { kind: "code"; language: string | null; lines: string[] };

type InlineFormat = {
  marker: string;
  render: (key: string, children: ReactNode[]) => ReactNode;
};

const INLINE_FORMATS: InlineFormat[] = [
  {
    marker: "||",
    render: (key, children) => (
      <span key={key} className="rounded bg-[#2b2d31] px-1 text-[#2b2d31] hover:text-white">
        {children}
      </span>
    ),
  },
  {
    marker: "~~",
    render: (key, children) => <s key={key}>{children}</s>,
  },
  {
    marker: "***",
    render: (key, children) => (
      <strong key={key}>
        <em>{children}</em>
      </strong>
    ),
  },
  {
    marker: "__",
    render: (key, children) => <u key={key}>{children}</u>,
  },
  {
    marker: "**",
    render: (key, children) => <strong key={key}>{children}</strong>,
  },
  {
    marker: "*",
    render: (key, children) => <em key={key}>{children}</em>,
  },
  {
    marker: "_",
    render: (key, children) => <em key={key}>{children}</em>,
  },
];

export function DiscordMarkdownPreview({
  content,
  emojis,
  className,
  frame = "default",
}: DiscordMarkdownPreviewProps) {
  const emojiById = new Map(emojis.map((emoji) => [emoji.id, emoji]));
  const blocks = parseDiscordBlocks(content);
  const body = renderPreviewBody(blocks, emojiById);

  if (frame === "mobile") {
    return (
      <div className={cn("mx-auto w-full max-w-[390px]", className)}>
        <div
          aria-label="Discord mobile preview"
          className="rounded-[2rem] border border-neutral-300 bg-[#1e1f22] p-2 shadow-sm"
        >
          <div className="overflow-hidden rounded-[1.5rem] bg-[#313338]">
            <div className="flex h-12 items-center gap-2 border-b border-white/10 px-4 text-white">
              <div className="h-8 w-8 rounded-full bg-[#5865f2]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">ClipProfit bot</p>
                <p className="text-[11px] text-[#b5bac1]">Discord mobile preview</p>
              </div>
            </div>
            <div className="min-h-[360px] bg-[#313338] p-3">
              {blocks.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-[#2b2d31] p-4 text-sm text-[#b5bac1]">
                  Preview verschijnt hier zodra je begint te typen.
                </div>
              ) : (
                <div className="rounded-lg bg-[#f2f3f5] p-3 text-sm leading-6 text-[#313338]">
                  {body}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className={cn("rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-400", className)}>
        Preview verschijnt hier zodra je begint te typen.
      </div>
    );
  }

  return (
    <div className={cn("discord-preview rounded-xl border border-neutral-200 bg-[#f2f3f5] p-4 text-sm leading-6 text-[#313338]", className)}>
      {body}
    </div>
  );
}

export function parseDiscordBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") {
      index++;
      continue;
    }

    const codeFence = /^```([A-Za-z0-9_+.-]*)\s*$/.exec(line);
    if (codeFence) {
      const codeLines: string[] = [];
      index++;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        codeLines.push(lines[index]);
        index++;
      }
      if (index < lines.length) index++;
      blocks.push({ kind: "code", language: codeFence[1] || null, lines: codeLines });
      continue;
    }

    const multilineQuote = /^>>>\s?(.*)$/.exec(line);
    if (multilineQuote) {
      const quoteLines = [multilineQuote[1], ...lines.slice(index + 1)];
      blocks.push({ kind: "quote", lines: quoteLines });
      break;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2] });
      index++;
      continue;
    }

    const subtext = /^-#\s+(.+)$/.exec(line);
    if (subtext) {
      blocks.push({ kind: "subtext", text: subtext[1] });
      index++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index++;
      }
      blocks.push({ kind: "quote", lines: quoteLines });
      continue;
    }

    const unorderedItem = parseListItem(line, false);
    if (unorderedItem) {
      const items: ListItem[] = [];
      while (index < lines.length) {
        const item = parseListItem(lines[index], false);
        if (!item) break;
        items.push(item);
        index++;
      }
      blocks.push({ kind: "ulist", items });
      continue;
    }

    const orderedItem = parseListItem(line, true);
    if (orderedItem) {
      const items: ListItem[] = [];
      while (index < lines.length) {
        const item = parseListItem(lines[index], true);
        if (!item) break;
        items.push(item);
        index++;
      }
      blocks.push({ kind: "olist", items });
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() !== "" && !startsBlock(lines[index])) {
      paragraph.push(lines[index]);
      index++;
    }
    blocks.push({ kind: "paragraph", lines: paragraph });
  }

  return blocks;
}

function renderPreviewBody(blocks: Block[], emojiById: Map<string, DiscordEmoji>) {
  return <div className="space-y-3">{blocks.map((block, index) => renderBlock(block, index, emojiById))}</div>;
}

function parseListItem(line: string, ordered: boolean): ListItem | null {
  const match = ordered ? /^(\s*)\d+\.\s+(.+)$/.exec(line) : /^(\s*)[-*]\s+(.+)$/.exec(line);
  if (!match) return null;
  const depth = Math.min(6, Math.floor(match[1].replace(/\t/g, "  ").length / 2));
  return { text: match[2], depth };
}

function startsBlock(line: string) {
  return (
    /^```/.test(line) ||
    /^>>>\s?/.test(line) ||
    /^>\s?/.test(line) ||
    /^(#{1,3})\s+\S/.test(line) ||
    /^-#\s+\S/.test(line) ||
    Boolean(parseListItem(line, false)) ||
    Boolean(parseListItem(line, true))
  );
}

function renderBlock(block: Block, key: number, emojiById: Map<string, DiscordEmoji>): ReactNode {
  switch (block.kind) {
    case "code":
      return (
        <div key={key} className="overflow-hidden rounded bg-[#e3e5e8] text-[#2b2d31]">
          {block.language ? (
            <div className="border-b border-[#c7ccd1] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6d6f78]">
              {block.language}
            </div>
          ) : null}
          <pre className="overflow-x-auto px-3 py-2 font-mono text-xs">
            <code>{block.lines.join("\n")}</code>
          </pre>
        </div>
      );
    case "heading":
      return renderHeading(block, key, emojiById);
    case "subtext":
      return (
        <p key={key} className="text-xs leading-5 text-[#6d6f78]">
          {renderInline(block.text, emojiById)}
        </p>
      );
    case "quote":
      return (
        <blockquote key={key} className="border-l-4 border-[#c7ccd1] pl-3 text-[#4e5058]">
          {block.lines.map((line, index) =>
            line.trim() === "" ? <br key={index} /> : <p key={index}>{renderInline(line, emojiById)}</p>,
          )}
        </blockquote>
      );
    case "ulist":
      return (
        <ul key={key} className="list-disc space-y-1 pl-6">
          {block.items.map((item, index) => renderListItem(item, index, emojiById))}
        </ul>
      );
    case "olist":
      return (
        <ol key={key} className="list-decimal space-y-1 pl-6">
          {block.items.map((item, index) => renderListItem(item, index, emojiById))}
        </ol>
      );
    case "paragraph":
      return (
        <div key={key} className="space-y-1">
          {block.lines.map((line, index) => (
            <p key={index}>{renderInline(line, emojiById)}</p>
          ))}
        </div>
      );
  }
}

function renderHeading(
  block: Extract<Block, { kind: "heading" }>,
  key: number,
  emojiById: Map<string, DiscordEmoji>,
) {
  if (block.level === 1) {
    return (
      <h1 key={key} className="text-xl font-bold leading-7 text-[#060607]">
        {renderInline(block.text, emojiById)}
      </h1>
    );
  }
  if (block.level === 2) {
    return (
      <h2 key={key} className="text-lg font-bold leading-7 text-[#060607]">
        {renderInline(block.text, emojiById)}
      </h2>
    );
  }
  return (
    <h3 key={key} className="text-base font-bold leading-6 text-[#060607]">
      {renderInline(block.text, emojiById)}
    </h3>
  );
}

function renderListItem(item: ListItem, index: number, emojiById: Map<string, DiscordEmoji>) {
  return (
    <li key={index} style={item.depth > 0 ? { marginLeft: `${item.depth * 1.25}rem` } : undefined}>
      {renderInline(item.text, emojiById)}
    </li>
  );
}

function renderInline(text: string, emojiById: Map<string, DiscordEmoji>): ReactNode[] {
  return renderInlineSegments(text, emojiById, "inline");
}

function renderInlineSegments(text: string, emojiById: Map<string, DiscordEmoji>, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let buffer = "";
  let index = 0;
  let key = 0;

  function flush() {
    if (!buffer) return;
    nodes.push(buffer);
    buffer = "";
  }

  while (index < text.length) {
    if (text[index] === "\\" && index + 1 < text.length && isEscapable(text[index + 1])) {
      buffer += text[index + 1];
      index += 2;
      continue;
    }

    const emojiMatch = /^<a?:([A-Za-z0-9_~]+):(\d+)>/.exec(text.slice(index));
    if (emojiMatch) {
      flush();
      const emoji = emojiById.get(emojiMatch[2]);
      nodes.push(
        emoji ? (
          <img
            key={`${keyPrefix}-emoji-${key++}`}
            alt={`:${emoji.name}:`}
            src={emoji.url}
            className="mx-0.5 inline-block h-[22px] w-[22px] align-[-0.35em]"
          />
        ) : (
          <span key={`${keyPrefix}-emoji-${key++}`}>{emojiMatch[0]}</span>
        ),
      );
      index += emojiMatch[0].length;
      continue;
    }

    const codeMatch = /^`([^`\n]+)`/.exec(text.slice(index));
    if (codeMatch) {
      flush();
      nodes.push(
        <code key={`${keyPrefix}-code-${key++}`} className="rounded bg-[#e3e5e8] px-1.5 py-0.5 font-mono text-xs">
          {codeMatch[1]}
        </code>,
      );
      index += codeMatch[0].length;
      continue;
    }

    const linkMatch = /^\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/.exec(text.slice(index));
    if (linkMatch) {
      flush();
      nodes.push(
        <a
          key={`${keyPrefix}-link-${key++}`}
          href={linkMatch[2]}
          className="text-[#006ce7] underline"
          target="_blank"
          rel="noreferrer"
        >
          {renderInlineSegments(linkMatch[1], emojiById, `${keyPrefix}-link-label-${key}`)}
        </a>,
      );
      index += linkMatch[0].length;
      continue;
    }

    const urlMatch = /^https?:\/\/[^\s<]+/.exec(text.slice(index));
    if (urlMatch) {
      flush();
      const { url, trailing } = splitTrailingUrlPunctuation(urlMatch[0]);
      nodes.push(
        <a
          key={`${keyPrefix}-url-${key++}`}
          href={url}
          className="text-[#006ce7] underline"
          target="_blank"
          rel="noreferrer"
        >
          {url}
        </a>,
      );
      if (trailing) buffer += trailing;
      index += urlMatch[0].length;
      continue;
    }

    const format = findInlineFormat(text, index);
    if (format) {
      const closingIndex = findClosingMarker(text, format.marker, index + format.marker.length);
      if (closingIndex > index + format.marker.length) {
        flush();
        const inner = text.slice(index + format.marker.length, closingIndex);
        nodes.push(format.render(`${keyPrefix}-format-${key++}`, renderInlineSegments(inner, emojiById, `${keyPrefix}-${key}`)));
        index = closingIndex + format.marker.length;
        continue;
      }
    }

    buffer += text[index];
    index++;
  }

  flush();
  return nodes;
}

function findInlineFormat(text: string, index: number) {
  for (const format of INLINE_FORMATS) {
    if (!text.startsWith(format.marker, index)) continue;
    const next = text[index + format.marker.length];
    if (!next || /\s/.test(next)) continue;
    return format;
  }
  return null;
}

function findClosingMarker(text: string, marker: string, from: number) {
  let index = from;
  while (index < text.length) {
    const found = text.indexOf(marker, index);
    if (found === -1) return -1;
    if (!isEscapedAt(text, found)) return found;
    index = found + marker.length;
  }
  return -1;
}

function isEscapable(char: string) {
  return ["\\", "*", "_", "~", "`", "|", "[", "]", "(", ")", "#", ">", "-"].includes(char);
}

function isEscapedAt(text: string, index: number) {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor--) slashCount++;
  return slashCount % 2 === 1;
}

function splitTrailingUrlPunctuation(value: string) {
  let url = value;
  let trailing = "";
  while (/[.,!?)]$/.test(url)) {
    trailing = `${url.at(-1)}${trailing}`;
    url = url.slice(0, -1);
  }
  return { url, trailing };
}

/* eslint-disable @next/next/no-img-element */
import { Fragment, type ReactNode } from "react";
import type { DiscordEmoji } from "@/lib/admin/discord";
import type { DiscordEmbedInput, DiscordEmbedPayload, DiscordLinkButton } from "@/lib/admin/discord-message-validation";
import { normalizeDiscordEmbeds, normalizeDiscordLinkButtons } from "@/lib/admin/discord-message-validation";
import { cn } from "@/lib/cn";

interface DiscordMarkdownPreviewProps {
  content: string;
  emojis: DiscordEmoji[];
  embeds?: DiscordEmbedInput[];
  buttons?: DiscordLinkButton[];
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

type PreviewVariant = "default" | "mobile";

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
  embeds = [],
  buttons = [],
  className,
  frame = "default",
}: DiscordMarkdownPreviewProps) {
  const emojiById = new Map(emojis.map((emoji) => [emoji.id, emoji]));
  const blocks = parseDiscordBlocks(content);
  const cleanedEmbeds = normalizeDiscordEmbeds(embeds);
  const linkButtons = normalizeDiscordLinkButtons(buttons);
  const variant: PreviewVariant = frame === "mobile" ? "mobile" : "default";
  const body = renderPreviewBody(blocks, emojiById, variant);
  const embedPreview = renderEmbeds(cleanedEmbeds, emojiById, variant);
  const buttonPreview = renderLinkButtons(linkButtons, variant);

  if (frame === "mobile") {
    return (
      <div className={cn("mx-auto w-full max-w-[390px]", className)}>
        <div
          aria-label="Discord mobile message preview"
          className="discord-mobile-message rounded-xl bg-[#313338] px-3 py-3 text-[#dbdee1] shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#5865f2]">
              <div className="flex h-full w-full items-center justify-center text-sm font-black text-white">CP</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] leading-4">
                <span className="truncate font-semibold text-[#f2f3f5]">ClipProfit bot</span>
                <span className="rounded-[3px] bg-[#5865f2] px-1 py-0.5 text-[9px] font-bold leading-none text-white">BOT</span>
                <span className="text-[#949ba4]">Today at 12:00</span>
              </div>
              <div className="mt-1 min-h-[320px] text-[16px] leading-[1.35] tracking-normal text-[#dbdee1]">
                {blocks.length === 0 && cleanedEmbeds.length === 0 && linkButtons.length === 0 ? (
                  <div className="rounded-lg border border-white/10 bg-[#2b2d31] p-4 text-sm text-[#b5bac1]">
                    Preview verschijnt hier zodra je begint te typen.
                  </div>
                ) : (
                  <>
                    {blocks.length > 0 ? body : null}
                    {embedPreview}
                    {buttonPreview}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (blocks.length === 0 && cleanedEmbeds.length === 0 && linkButtons.length === 0) {
    return (
      <div className={cn("rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-400", className)}>
        Preview verschijnt hier zodra je begint te typen.
      </div>
    );
  }

  return (
    <div className={cn("discord-preview rounded-xl border border-neutral-200 bg-[#f2f3f5] p-4 text-sm leading-6 text-[#313338]", className)}>
      {blocks.length > 0 ? body : null}
      {embedPreview}
      {buttonPreview}
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

function renderPreviewBody(blocks: Block[], emojiById: Map<string, DiscordEmoji>, variant: PreviewVariant) {
  return (
    <div className={cn(variant === "mobile" ? "space-y-2" : "space-y-3")}>
      {blocks.map((block, index) => renderBlock(block, index, emojiById, variant))}
    </div>
  );
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

function renderBlock(block: Block, key: number, emojiById: Map<string, DiscordEmoji>, variant: PreviewVariant): ReactNode {
  switch (block.kind) {
    case "code":
      return (
        <div
          key={key}
          className={cn(
            "overflow-hidden rounded",
            variant === "mobile" ? "bg-[#2b2d31] text-[#dbdee1]" : "bg-[#e3e5e8] text-[#2b2d31]",
          )}
        >
          {block.language ? (
            <div
              className={cn(
                "border-b px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                variant === "mobile" ? "border-white/10 text-[#949ba4]" : "border-[#c7ccd1] text-[#6d6f78]",
              )}
            >
              {block.language}
            </div>
          ) : null}
          <pre className="overflow-x-auto px-3 py-2 font-mono text-xs">
            <code>{block.lines.join("\n")}</code>
          </pre>
        </div>
      );
    case "heading":
      return renderHeading(block, key, emojiById, variant);
    case "subtext":
      return (
        <p className={cn("whitespace-pre-wrap break-words text-xs leading-5", variant === "mobile" ? "text-[#949ba4]" : "text-[#6d6f78]")} key={key}>
          {renderInline(block.text, emojiById, variant)}
        </p>
      );
    case "quote":
      return (
        <blockquote
          key={key}
          className={cn(
            "whitespace-pre-wrap break-words border-l-4 pl-3",
            variant === "mobile" ? "border-[#4e5058] text-[#dbdee1]" : "border-[#c7ccd1] text-[#4e5058]",
          )}
        >
          {renderInlineLines(block.lines, emojiById, variant, `quote-${key}`)}
        </blockquote>
      );
    case "ulist":
      return (
        <ul key={key} className={cn("list-disc space-y-1 pl-6", variant === "mobile" && "marker:text-[#dbdee1]")}>
          {block.items.map((item, index) => renderListItem(item, index, emojiById, variant))}
        </ul>
      );
    case "olist":
      return (
        <ol key={key} className={cn("list-decimal space-y-1 pl-6", variant === "mobile" && "marker:text-[#dbdee1]")}>
          {block.items.map((item, index) => renderListItem(item, index, emojiById, variant))}
        </ol>
      );
    case "paragraph":
      return (
        <div key={key} className="whitespace-pre-wrap break-words">
          {renderInlineLines(block.lines, emojiById, variant, `paragraph-${key}`)}
        </div>
      );
  }
}

function renderHeading(
  block: Extract<Block, { kind: "heading" }>,
  key: number,
  emojiById: Map<string, DiscordEmoji>,
  variant: PreviewVariant,
) {
  const textClass = variant === "mobile" ? "text-[#f2f3f5]" : "text-[#060607]";
  if (block.level === 1) {
    return (
      <h1 key={key} className={cn("whitespace-pre-wrap break-words text-xl font-bold leading-7", textClass)}>
        {renderInline(block.text, emojiById, variant)}
      </h1>
    );
  }
  if (block.level === 2) {
    return (
      <h2 key={key} className={cn("whitespace-pre-wrap break-words text-lg font-bold leading-7", textClass)}>
        {renderInline(block.text, emojiById, variant)}
      </h2>
    );
  }
  return (
    <h3 key={key} className={cn("whitespace-pre-wrap break-words text-base font-bold leading-6", textClass)}>
      {renderInline(block.text, emojiById, variant)}
    </h3>
  );
}

function renderListItem(item: ListItem, index: number, emojiById: Map<string, DiscordEmoji>, variant: PreviewVariant) {
  return (
    <li
      key={index}
      className="whitespace-pre-wrap break-words pl-1"
      style={item.depth > 0 ? { marginLeft: `${item.depth * 1.25}rem` } : undefined}
    >
      {renderInline(item.text, emojiById, variant)}
    </li>
  );
}

function renderInlineLines(lines: string[], emojiById: Map<string, DiscordEmoji>, variant: PreviewVariant, keyPrefix: string): ReactNode[] {
  return lines.map((line, index) => (
    <Fragment key={`${keyPrefix}-line-${index}`}>
      {renderInline(line, emojiById, variant)}
      {index < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
}

function renderEmbeds(embeds: DiscordEmbedPayload[], emojiById: Map<string, DiscordEmoji>, variant: PreviewVariant): ReactNode {
  if (embeds.length === 0) return null;
  return (
    <div className="mt-3 space-y-3">
      {embeds.map((embed, index) => (
        <article
          key={index}
          className={cn(
            "relative overflow-hidden rounded-md border-l-4 px-3 py-3",
            variant === "mobile"
              ? "max-w-[295px] bg-[#2b2d31] text-[#dbdee1]"
              : "max-w-[520px] border border-[#c7ccd1] bg-white text-[#313338]",
          )}
          style={{ borderLeftColor: numberToHex(embed.color ?? 0x5865f2) }}
        >
          <div className="flex gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              {embed.author ? (
                <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-[#f2f3f5]">
                  {embed.author.icon_url ? (
                    <img src={embed.author.icon_url} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
                  ) : null}
                  {embed.author.url ? (
                    <a href={embed.author.url} target="_blank" rel="noreferrer" className="truncate text-[#f2f3f5] no-underline hover:underline">
                      {embed.author.name}
                    </a>
                  ) : (
                    <span className={cn("truncate", variant === "mobile" ? "text-[#f2f3f5]" : "text-[#313338]")}>{embed.author.name}</span>
                  )}
                </div>
              ) : null}

              {embed.title ? (
                embed.url ? (
                  <a
                    href={embed.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block break-words text-sm font-semibold leading-5 text-[#00a8fc] no-underline hover:underline"
                  >
                    {renderInline(embed.title, emojiById, variant)}
                  </a>
                ) : (
                  <h3 className={cn("break-words text-sm font-semibold leading-5", variant === "mobile" ? "text-[#f2f3f5]" : "text-[#313338]")}>
                    {renderInline(embed.title, emojiById, variant)}
                  </h3>
                )
              ) : null}

              {embed.description ? (
                <div className="text-sm leading-[1.38]">
                  {renderPreviewBody(parseDiscordBlocks(embed.description), emojiById, variant)}
                </div>
              ) : null}

              {embed.fields && embed.fields.length > 0 ? (
                <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-3">
                  {embed.fields.map((field, fieldIndex) => (
                    <div key={fieldIndex} className={cn("min-w-0", field.inline ? "sm:col-span-1" : "sm:col-span-3")}>
                      <p className={cn("break-words text-sm font-semibold leading-5", variant === "mobile" ? "text-[#f2f3f5]" : "text-[#313338]")}>
                        {renderInline(field.name, emojiById, variant)}
                      </p>
                      <div className="break-words text-sm leading-5">
                        {renderInlineLines(field.value.split("\n"), emojiById, variant, `embed-${fieldIndex}`)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {embed.image ? (
                <img src={embed.image.url} alt="" className="mt-2 max-h-[260px] w-full rounded object-cover" />
              ) : null}

              {embed.footer || embed.timestamp ? (
                <div className="flex min-w-0 items-center gap-1.5 text-xs leading-4 text-[#949ba4]">
                  {embed.footer?.icon_url ? <img src={embed.footer.icon_url} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" /> : null}
                  {embed.footer?.text ? <span className="truncate">{embed.footer.text}</span> : null}
                  {embed.footer?.text && embed.timestamp ? <span aria-hidden="true">&middot;</span> : null}
                  {embed.timestamp ? <span>{formatDiscordPreviewTime(embed.timestamp)}</span> : null}
                </div>
              ) : null}
            </div>
            {embed.thumbnail ? (
              <img src={embed.thumbnail.url} alt="" className="h-20 w-20 shrink-0 rounded object-cover" />
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function renderInline(text: string, emojiById: Map<string, DiscordEmoji>, variant: PreviewVariant): ReactNode[] {
  return renderInlineSegments(text, emojiById, "inline", variant);
}

function numberToHex(value: number): string {
  return `#${Math.max(0, Math.min(0xffffff, value)).toString(16).padStart(6, "0")}`;
}

function formatDiscordPreviewTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderLinkButtons(buttons: DiscordLinkButton[], variant: PreviewVariant): ReactNode {
  if (buttons.length === 0) return null;
  return (
    <div className={cn("mt-3 flex flex-wrap gap-2", variant === "mobile" ? "max-w-[260px]" : "max-w-[520px]")}>
      {buttons.map((button, index) => (
        <a
          key={`${button.url}-${index}`}
          href={button.url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "inline-flex h-8 max-w-full items-center justify-center truncate rounded px-3 text-sm font-medium no-underline",
            variant === "mobile"
              ? "bg-[#4e5058] text-[#f2f3f5] hover:bg-[#5c5f66]"
              : "border border-[#c7ccd1] bg-white text-[#313338] hover:bg-[#e3e5e8]",
          )}
        >
          <span className="truncate">{button.label}</span>
        </a>
      ))}
    </div>
  );
}

function renderInlineSegments(text: string, emojiById: Map<string, DiscordEmoji>, keyPrefix: string, variant: PreviewVariant): ReactNode[] {
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
        <code
          key={`${keyPrefix}-code-${key++}`}
          className={cn(
            "rounded px-1.5 py-0.5 font-mono text-xs",
            variant === "mobile" ? "bg-[#2b2d31] text-[#dbdee1]" : "bg-[#e3e5e8]",
          )}
        >
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
          {renderInlineSegments(linkMatch[1], emojiById, `${keyPrefix}-link-label-${key}`, variant)}
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
        nodes.push(format.render(`${keyPrefix}-format-${key++}`, renderInlineSegments(inner, emojiById, `${keyPrefix}-${key}`, variant)));
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

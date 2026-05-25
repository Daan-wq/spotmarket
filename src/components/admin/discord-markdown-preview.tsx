/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import type { DiscordEmoji } from "@/lib/admin/discord";
import { cn } from "@/lib/cn";

interface DiscordMarkdownPreviewProps {
  content: string;
  emojis: DiscordEmoji[];
  className?: string;
}

type Block =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "quote"; lines: string[] }
  | { kind: "ulist"; lines: string[] }
  | { kind: "olist"; lines: string[] }
  | { kind: "code"; lines: string[] };

export function DiscordMarkdownPreview({
  content,
  emojis,
  className,
}: DiscordMarkdownPreviewProps) {
  const emojiById = new Map(emojis.map((emoji) => [emoji.id, emoji]));
  const blocks = parseDiscordBlocks(content);

  if (blocks.length === 0) {
    return (
      <div className={cn("rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-400", className)}>
        Preview verschijnt hier zodra je begint te typen.
      </div>
    );
  }

  return (
    <div className={cn("discord-preview rounded-xl border border-neutral-200 bg-[#f2f3f5] p-4 text-sm leading-6 text-[#313338]", className)}>
      <div className="space-y-3">
        {blocks.map((block, index) => renderBlock(block, index, emojiById))}
      </div>
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

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      index++;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index++;
      }
      if (index < lines.length) index++;
      blocks.push({ kind: "code", lines: codeLines });
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

    if (/^\s*[-*]\s+/.test(line)) {
      const itemLines: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        itemLines.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index++;
      }
      blocks.push({ kind: "ulist", lines: itemLines });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const itemLines: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        itemLines.push(lines[index].replace(/^\s*\d+\.\s+/, ""));
        index++;
      }
      blocks.push({ kind: "olist", lines: itemLines });
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !lines[index].startsWith("```") &&
      !/^>\s?/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index++;
    }
    blocks.push({ kind: "paragraph", lines: paragraph });
  }

  return blocks;
}

function renderBlock(block: Block, key: number, emojiById: Map<string, DiscordEmoji>): ReactNode {
  switch (block.kind) {
    case "code":
      return (
        <pre key={key} className="overflow-x-auto rounded bg-[#e3e5e8] px-3 py-2 font-mono text-xs text-[#2b2d31]">
          <code>{block.lines.join("\n")}</code>
        </pre>
      );
    case "quote":
      return (
        <blockquote key={key} className="border-l-4 border-[#c7ccd1] pl-3 text-[#4e5058]">
          {block.lines.map((line, index) => (
            <p key={index}>{renderInline(line, emojiById)}</p>
          ))}
        </blockquote>
      );
    case "ulist":
      return (
        <ul key={key} className="list-disc space-y-1 pl-6">
          {block.lines.map((line, index) => (
            <li key={index}>{renderInline(line, emojiById)}</li>
          ))}
        </ul>
      );
    case "olist":
      return (
        <ol key={key} className="list-decimal space-y-1 pl-6">
          {block.lines.map((line, index) => (
            <li key={index}>{renderInline(line, emojiById)}</li>
          ))}
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

function renderInline(text: string, emojiById: Map<string, DiscordEmoji>): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const next = findNextToken(remaining);
    if (!next) {
      nodes.push(remaining);
      break;
    }

    if (next.start > 0) nodes.push(remaining.slice(0, next.start));
    const token = remaining.slice(next.start, next.end);
    nodes.push(renderToken(token, key++, emojiById));
    remaining = remaining.slice(next.end);
  }

  return nodes;
}

function findNextToken(text: string): { start: number; end: number } | null {
  const patterns = [
    /<a?:[A-Za-z0-9_~]+:\d+>/,
    /\|\|[^|]+\|\|/,
    /`[^`]+`/,
    /\*\*[^*]+\*\*/,
    /__[^_]+__/,
    /~~[^~]+~~/,
    /\[[^\]]+\]\(https?:\/\/[^)\s]+\)/,
    /(^|[^*])\*[^*\s][^*]*\*/,
  ];

  let best: { start: number; end: number } | null = null;
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match || match.index == null) continue;
    const prefixAdjust = pattern.source.startsWith("(^|") && match[1] ? match[1].length : 0;
    const start = match.index + prefixAdjust;
    const end = match.index + match[0].length;
    if (!best || start < best.start) best = { start, end };
  }
  return best;
}

function renderToken(token: string, key: number, emojiById: Map<string, DiscordEmoji>): ReactNode {
  const emojiMatch = /^<a?:([A-Za-z0-9_~]+):(\d+)>$/.exec(token);
  if (emojiMatch) {
    const emoji = emojiById.get(emojiMatch[2]);
    if (!emoji) return <span key={key}>{token}</span>;
    return (
      <img
        key={key}
        alt={`:${emoji.name}:`}
        src={emoji.url}
        className="mx-0.5 inline-block h-[22px] w-[22px] align-[-0.35em]"
      />
    );
  }

  if (token.startsWith("||") && token.endsWith("||")) {
    return (
      <span key={key} className="rounded bg-[#2b2d31] px-1 text-[#2b2d31] hover:text-white">
        {token.slice(2, -2)}
      </span>
    );
  }
  if (token.startsWith("`") && token.endsWith("`")) {
    return (
      <code key={key} className="rounded bg-[#e3e5e8] px-1.5 py-0.5 font-mono text-xs">
        {token.slice(1, -1)}
      </code>
    );
  }
  if (token.startsWith("**") && token.endsWith("**")) return <strong key={key}>{token.slice(2, -2)}</strong>;
  if (token.startsWith("__") && token.endsWith("__")) return <u key={key}>{token.slice(2, -2)}</u>;
  if (token.startsWith("~~") && token.endsWith("~~")) return <s key={key}>{token.slice(2, -2)}</s>;
  if (token.startsWith("*") && token.endsWith("*")) return <em key={key}>{token.slice(1, -1)}</em>;

  const linkMatch = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(token);
  if (linkMatch) {
    return (
      <a key={key} href={linkMatch[2]} className="text-[#006ce7] underline" target="_blank" rel="noreferrer">
        {linkMatch[1]}
      </a>
    );
  }

  return <span key={key}>{token}</span>;
}

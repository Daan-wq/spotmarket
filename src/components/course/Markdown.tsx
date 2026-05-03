"use client";

import * as React from "react";

interface MarkdownProps {
  source: string;
}

export function Markdown({ source }: MarkdownProps) {
  return <div className="course-markdown">{render(source)}</div>;
}

interface Block {
  kind:
    | "heading"
    | "paragraph"
    | "ulist"
    | "olist"
    | "code"
    | "table"
    | "blockquote";
  level?: number;
  lines: string[];
  rows?: string[][];
}

function render(source: string): React.ReactNode {
  const blocks = parseBlocks(source);
  return blocks.map((block, i) => {
    switch (block.kind) {
      case "heading":
        return renderHeading(block, i);
      case "paragraph":
        return (
          <p key={i} className="my-3 text-sm leading-relaxed text-neutral-700">
            {renderInline(block.lines.join(" "))}
          </p>
        );
      case "ulist":
        return (
          <ul key={i} className="my-3 list-disc space-y-1 pl-6 text-sm text-neutral-700">
            {block.lines.map((line, j) => (
              <li key={j}>{renderInline(line)}</li>
            ))}
          </ul>
        );
      case "olist":
        return (
          <ol key={i} className="my-3 list-decimal space-y-1 pl-6 text-sm text-neutral-700">
            {block.lines.map((line, j) => (
              <li key={j}>{renderInline(line)}</li>
            ))}
          </ol>
        );
      case "code":
        return (
          <pre
            key={i}
            className="my-3 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-800"
          >
            <code>{block.lines.join("\n")}</code>
          </pre>
        );
      case "table":
        return renderTable(block, i);
      default:
        return null;
    }
  });
}

function renderHeading(block: Block, key: number) {
  const text = renderInline(block.lines.join(" "));
  const level = block.level ?? 1;
  const cls =
    level === 1
      ? "mt-2 mb-3 text-xl font-bold text-neutral-950"
      : level === 2
        ? "mt-5 mb-2 text-lg font-bold text-neutral-950"
        : "mt-4 mb-2 text-base font-semibold text-neutral-900";
  if (level === 1) return <h1 key={key} className={cls}>{text}</h1>;
  if (level === 2) return <h2 key={key} className={cls}>{text}</h2>;
  return <h3 key={key} className={cls}>{text}</h3>;
}

function renderTable(block: Block, key: number) {
  const rows = block.rows ?? [];
  if (rows.length < 1) return null;
  const [header, ...body] = rows;
  return (
    <div key={key} className="my-3 overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-neutral-50">
            {header.map((cell, i) => (
              <th
                key={i}
                className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-600"
              >
                {renderInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="border-t border-neutral-200">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-neutral-700">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    // Code fence
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ kind: "code", lines: codeLines });
      continue;
    }

    // Heading
    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      blocks.push({
        kind: "heading",
        level: headingMatch[1].length,
        lines: [headingMatch[2]],
      });
      i++;
      continue;
    }

    // Table (line starts with `|` and next line is separator)
    if (line.trim().startsWith("|") && i + 1 < lines.length && /^\|?[\s|:-]+\|?$/.test(lines[i + 1].trim())) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const row = lines[i]
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
        if (!/^[\s:-]+$/.test(row.join(""))) {
          rows.push(row);
        }
        i++;
      }
      blocks.push({ kind: "table", lines: [], rows });
      continue;
    }

    // Unordered list
    if (/^\s*-\s+/.test(line)) {
      const itemLines: string[] = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        itemLines.push(lines[i].replace(/^\s*-\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ulist", lines: itemLines });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const itemLines: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        itemLines.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "olist", lines: itemLines });
      continue;
    }

    // Paragraph (collect until blank line or special block start)
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,3})\s/.test(lines[i]) &&
      !/^\s*-\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !lines[i].startsWith("```") &&
      !lines[i].trim().startsWith("|")
    ) {
      para.push(lines[i]);
      i++;
    }
    if (para.length) blocks.push({ kind: "paragraph", lines: para });
  }

  return blocks;
}

function renderInline(text: string): React.ReactNode {
  // Tokens: code, bold, italic
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const codeIdx = remaining.indexOf("`");
    const boldIdx = remaining.indexOf("**");
    const italicMatch = /(^|[^*])\*(?!\*)([^*]+)\*(?!\*)/.exec(remaining);

    const candidates: Array<{ idx: number; type: "code" | "bold" | "italic"; matchStart?: number; italicLen?: number }> = [];
    if (codeIdx >= 0) candidates.push({ idx: codeIdx, type: "code" });
    if (boldIdx >= 0) candidates.push({ idx: boldIdx, type: "bold" });
    if (italicMatch) {
      const start = italicMatch.index + (italicMatch[1] ? 1 : 0);
      candidates.push({ idx: start, type: "italic", matchStart: start, italicLen: italicMatch[2].length + 2 });
    }

    if (candidates.length === 0) {
      parts.push(<React.Fragment key={key++}>{remaining}</React.Fragment>);
      break;
    }

    candidates.sort((a, b) => a.idx - b.idx);
    const next = candidates[0];

    if (next.idx > 0) {
      parts.push(<React.Fragment key={key++}>{remaining.slice(0, next.idx)}</React.Fragment>);
    }

    if (next.type === "code") {
      const close = remaining.indexOf("`", next.idx + 1);
      if (close === -1) {
        parts.push(<React.Fragment key={key++}>{remaining.slice(next.idx)}</React.Fragment>);
        break;
      }
      const inner = remaining.slice(next.idx + 1, close);
      parts.push(
        <code
          key={key++}
          className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[12px] text-neutral-900"
        >
          {inner}
        </code>,
      );
      remaining = remaining.slice(close + 1);
    } else if (next.type === "bold") {
      const close = remaining.indexOf("**", next.idx + 2);
      if (close === -1) {
        parts.push(<React.Fragment key={key++}>{remaining.slice(next.idx)}</React.Fragment>);
        break;
      }
      const inner = remaining.slice(next.idx + 2, close);
      parts.push(
        <strong key={key++} className="font-semibold text-neutral-950">
          {inner}
        </strong>,
      );
      remaining = remaining.slice(close + 2);
    } else if (next.type === "italic") {
      const start = next.matchStart ?? next.idx;
      const len = next.italicLen ?? 0;
      const inner = remaining.slice(start + 1, start + len - 1);
      parts.push(
        <em key={key++} className="italic">
          {inner}
        </em>,
      );
      remaining = remaining.slice(start + len);
    }
  }

  return parts;
}

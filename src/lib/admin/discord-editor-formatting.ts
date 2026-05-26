export interface SelectionRange {
  start: number;
  end: number;
}

export interface FormattingResult {
  content: string;
  selection: SelectionRange;
  activeInlineFormat: string | null;
}

interface InlineFormatInput {
  content: string;
  selection: SelectionRange;
  prefix: string;
  suffix: string;
  fallback: string;
  activeInlineFormat: string | null;
}

interface LinePrefixInput {
  content: string;
  selection: SelectionRange;
  prefix: string;
  removePattern?: RegExp;
}

interface BlockFormatInput {
  content: string;
  selection: SelectionRange;
  prefix: string;
  suffix: string;
  fallback: string;
}

const ESCAPABLE_MARKDOWN = new Set(["\\", "*", "_", "~", "`", "|", "[", "]", "(", ")", "#", ">", "-"]);

export function formatId(prefix: string, suffix: string): string {
  return `${prefix}\u0000${suffix}`;
}

export function toggleInlineFormat(input: InlineFormatInput): FormattingResult {
  const { content, prefix, suffix, fallback, activeInlineFormat } = input;
  const selection = clampSelection(input.selection, content.length);
  const id = formatId(prefix, suffix);

  if (selection.start === selection.end) {
    const insert = activeInlineFormat === id ? suffix : prefix;
    const next = replaceRange(content, selection.start, selection.end, insert);
    const caret = selection.start + insert.length;
    return {
      content: next,
      selection: { start: caret, end: caret },
      activeInlineFormat: activeInlineFormat === id ? null : id,
    };
  }

  const selected = content.slice(selection.start, selection.end);
  const selectedHasMarkers = selected.startsWith(prefix) && selected.endsWith(suffix) && selected.length > prefix.length + suffix.length;
  if (selectedHasMarkers) {
    const inner = selected.slice(prefix.length, selected.length - suffix.length);
    return {
      content: replaceRange(content, selection.start, selection.end, inner),
      selection: { start: selection.start, end: selection.start + inner.length },
      activeInlineFormat: null,
    };
  }

  const hasAdjacentMarkers =
    content.slice(selection.start - prefix.length, selection.start) === prefix &&
    content.slice(selection.end, selection.end + suffix.length) === suffix;
  if (hasAdjacentMarkers) {
    const next = `${content.slice(0, selection.start - prefix.length)}${selected}${content.slice(selection.end + suffix.length)}`;
    const nextStart = selection.start - prefix.length;
    return {
      content: next,
      selection: { start: nextStart, end: nextStart + selected.length },
      activeInlineFormat: null,
    };
  }

  const value = selected || fallback;
  const wrapped = `${prefix}${value}${suffix}`;
  return {
    content: replaceRange(content, selection.start, selection.end, wrapped),
    selection: { start: selection.start + prefix.length, end: selection.start + prefix.length + value.length },
    activeInlineFormat: null,
  };
}

export function toggleLinePrefix(input: LinePrefixInput): FormattingResult {
  const { content, prefix, removePattern } = input;
  const bounds = selectedLineBounds(content, input.selection);
  const block = content.slice(bounds.start, bounds.end);
  const lines = block.split("\n");
  const nonEmptyLines = lines.filter((line) => line.length > 0);
  const shouldPrefixEmptyLines = nonEmptyLines.length === 0;
  const shouldRemove =
    nonEmptyLines.length > 0 &&
    nonEmptyLines.every((line) => line.startsWith(prefix));

  const nextBlock = lines
    .map((line) => {
      if (line.length === 0 && !shouldPrefixEmptyLines) return line;
      if (shouldRemove) {
        const match = prefixMatch(line, prefix, removePattern);
        return match ? line.slice(match.length) : line;
      }
      const cleaned = removePattern ? line.replace(removePattern, "") : line;
      return `${prefix}${cleaned}`;
    })
    .join("\n");

  return {
    content: replaceRange(content, bounds.start, bounds.end, nextBlock),
    selection: { start: bounds.start, end: bounds.start + nextBlock.length },
    activeInlineFormat: null,
  };
}

export function toggleBlockFormat(input: BlockFormatInput): FormattingResult {
  const { content, prefix, suffix, fallback } = input;
  const selection = clampSelection(input.selection, content.length);
  const selected = content.slice(selection.start, selection.end) || fallback;
  const selectedHasMarkers =
    selected.startsWith(prefix) &&
    (suffix === "" || selected.endsWith(suffix)) &&
    selected.length > prefix.length + suffix.length;

  if (selectedHasMarkers) {
    const inner = suffix ? selected.slice(prefix.length, selected.length - suffix.length) : selected.slice(prefix.length);
    return {
      content: replaceRange(content, selection.start, selection.end, inner),
      selection: { start: selection.start, end: selection.start + inner.length },
      activeInlineFormat: null,
    };
  }

  const hasAdjacentMarkers =
    content.slice(selection.start - prefix.length, selection.start) === prefix &&
    (suffix === "" || content.slice(selection.end, selection.end + suffix.length) === suffix);
  if (hasAdjacentMarkers) {
    const next = `${content.slice(0, selection.start - prefix.length)}${selected}${content.slice(selection.end + suffix.length)}`;
    const nextStart = selection.start - prefix.length;
    return {
      content: next,
      selection: { start: nextStart, end: nextStart + selected.length },
      activeInlineFormat: null,
    };
  }

  const leadingBreak = selection.start > 0 && !content.slice(0, selection.start).endsWith("\n") ? "\n" : "";
  const trailingBreak = selection.end < content.length && !content.slice(selection.end).startsWith("\n") ? "\n" : "";
  const insert = `${leadingBreak}${prefix}${selected}${suffix}${trailingBreak}`;
  const innerStart = selection.start + leadingBreak.length + prefix.length;

  return {
    content: replaceRange(content, selection.start, selection.end, insert),
    selection: { start: innerStart, end: innerStart + selected.length },
    activeInlineFormat: null,
  };
}

export function isInlineFormatActive(
  content: string,
  selection: SelectionRange,
  prefix: string,
  suffix: string,
  activeInlineFormat: string | null,
): boolean {
  const normalized = clampSelection(selection, content.length);
  if (activeInlineFormat === formatId(prefix, suffix)) return true;
  if (normalized.start === normalized.end) return false;
  const selected = content.slice(normalized.start, normalized.end);
  return (
    (selected.startsWith(prefix) && selected.endsWith(suffix)) ||
    (content.slice(normalized.start - prefix.length, normalized.start) === prefix &&
      content.slice(normalized.end, normalized.end + suffix.length) === suffix)
  );
}

export function isLinePrefixActive(
  content: string,
  selection: SelectionRange,
  prefix: string,
  removePattern?: RegExp,
): boolean {
  const bounds = selectedLineBounds(content, selection);
  const lines = content.slice(bounds.start, bounds.end).split("\n").filter((line) => line.length > 0);
  return lines.length > 0 && lines.every((line) => Boolean(prefixMatch(line, prefix, removePattern)));
}

export function isBlockFormatActive(
  content: string,
  selection: SelectionRange,
  prefix: string,
  suffix: string,
): boolean {
  const normalized = clampSelection(selection, content.length);
  const selected = content.slice(normalized.start, normalized.end);
  return (
    (selected.startsWith(prefix) && (suffix === "" || selected.endsWith(suffix))) ||
    (content.slice(normalized.start - prefix.length, normalized.start) === prefix &&
      (suffix === "" || content.slice(normalized.end, normalized.end + suffix.length) === suffix))
  );
}

export function escapeDiscordMarkdown(value: string): string {
  return Array.from(value)
    .map((char) => (ESCAPABLE_MARKDOWN.has(char) ? `\\${char}` : char))
    .join("");
}

function replaceRange(content: string, start: number, end: number, value: string): string {
  return `${content.slice(0, start)}${value}${content.slice(end)}`;
}

function clampSelection(selection: SelectionRange, max: number): SelectionRange {
  const start = Math.max(0, Math.min(selection.start, max));
  const end = Math.max(start, Math.min(selection.end, max));
  return { start, end };
}

function selectedLineBounds(content: string, selection: SelectionRange): SelectionRange {
  const normalized = clampSelection(selection, content.length);
  const start = content.lastIndexOf("\n", Math.max(0, normalized.start - 1)) + 1;
  const endLookup = normalized.end > normalized.start ? normalized.end - 1 : normalized.end;
  const nextBreak = content.indexOf("\n", Math.max(normalized.start, endLookup));
  return {
    start,
    end: nextBreak === -1 ? content.length : nextBreak,
  };
}

function prefixMatch(line: string, prefix: string, removePattern?: RegExp): string | null {
  if (line.startsWith(prefix)) return prefix;
  if (!removePattern) return null;
  const match = removePattern.exec(line);
  return match?.[0] ?? null;
}

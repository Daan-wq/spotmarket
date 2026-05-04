export type RangeKey = "7d" | "30d" | "90d" | "all";

export interface Range {
  key: RangeKey;
  label: string;
  start: Date | null; // null = "all"
  end: Date;
  prevStart: Date | null;
  prevEnd: Date | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseRange(searchParams: { range?: string | string[] | undefined } | URLSearchParams | undefined): Range {
  const raw =
    searchParams instanceof URLSearchParams
      ? searchParams.get("range")
      : Array.isArray(searchParams?.range)
        ? searchParams?.range[0]
        : searchParams?.range;
  const key: RangeKey = raw === "7d" || raw === "30d" || raw === "90d" || raw === "all" ? raw : "30d";
  return rangeFor(key);
}

export function rangeFor(key: RangeKey): Range {
  const end = new Date();
  if (key === "all") {
    return { key, label: "All time", start: null, end, prevStart: null, prevEnd: null };
  }
  const days = key === "7d" ? 7 : key === "30d" ? 30 : 90;
  const start = new Date(end.getTime() - days * DAY_MS);
  const prevEnd = start;
  const prevStart = new Date(start.getTime() - days * DAY_MS);
  return {
    key,
    label: `Last ${days}d`,
    start,
    end,
    prevStart,
    prevEnd,
  };
}

export function withinRange(range: Range): { gte?: Date; lte?: Date } {
  if (range.start === null) return {};
  return { gte: range.start, lte: range.end };
}

export function withinPrevRange(range: Range): { gte?: Date; lte?: Date } | null {
  if (range.prevStart === null || range.prevEnd === null) return null;
  return { gte: range.prevStart, lte: range.prevEnd };
}

export function pctDelta(current: number, prior: number): number | null {
  if (prior === 0) return current === 0 ? 0 : null;
  return ((current - prior) / prior) * 100;
}

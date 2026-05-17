import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SCAN_TARGETS = [
  "src/app/(creator)/creator",
  "src/components/creator-analytics",
  "src/components/submissions/submitted-clips-list.tsx",
  "src/components/campaigns/campaign-display.tsx",
  "src/components/shared/EarningsCard.tsx",
];

const STRING_PROP_PATTERN =
  /\b(title|description|label|placeholder|aria-label)=["']([^"']*[A-Za-z][^"']*)["']/g;
const JSX_TEXT_PATTERN = />\s*([^<>{}]*[A-Za-z][^<>{}]*)\s*</g;
const LOCALE_PATTERN = /\.toLocale(?:String|DateString|TimeString)\(/;

function collectTsxFiles(target: string): string[] {
  const absolute = path.join(ROOT, target);
  if (!existsSync(absolute)) return [];
  if (statSync(absolute).isFile())
    return absolute.endsWith(".tsx") ? [absolute] : [];

  return readdirSync(absolute).flatMap((entry) => {
    const child = path.join(absolute, entry);
    if (statSync(child).isDirectory()) {
      return collectTsxFiles(path.relative(ROOT, child));
    }
    return child.endsWith(".tsx") ? [child] : [];
  });
}

function isAllowedLiteral(value: string): boolean {
  const normalized = value.trim();

  return (
    normalized.length === 0 ||
    normalized === "USDT TRC-20" ||
    normalized === "0x..." ||
    normalized === "T..." ||
    /^Txx+$/.test(normalized) ||
    /^[A-Z0-9_./:-]+$/.test(normalized)
  );
}

function isLikelyTypescript(line: string): boolean {
  return (
    line.includes("=>") ||
    line.includes("ReturnType<") ||
    line.trimStart().startsWith("function ") ||
    line.trimStart().startsWith("interface ") ||
    line.trimStart().startsWith("type ")
  );
}

describe("creator localization guard", () => {
  it("keeps visible creator copy and key string props out of TSX literals", () => {
    const offenders: string[] = [];

    for (const file of SCAN_TARGETS.flatMap(collectTsxFiles)) {
      const relativeFile = path.relative(ROOT, file);
      const lines = readFileSync(file, "utf8").split(/\r?\n/);

      lines.forEach((line, index) => {
        if (LOCALE_PATTERN.test(line)) {
          offenders.push(
            `${relativeFile}:${index + 1} uses a raw toLocale formatter`,
          );
        }

        if (!isLikelyTypescript(line)) {
          for (const match of line.matchAll(JSX_TEXT_PATTERN)) {
            const value = match[1]?.replace(/\s+/g, " ").trim() ?? "";
            if (!isAllowedLiteral(value)) {
              offenders.push(
                `${relativeFile}:${index + 1} has visible JSX text "${value}"`,
              );
            }
          }
        }

        for (const match of line.matchAll(STRING_PROP_PATTERN)) {
          const prop = match[1];
          const value = match[2]?.trim() ?? "";
          if (!isAllowedLiteral(value)) {
            offenders.push(
              `${relativeFile}:${index + 1} has ${prop}="${value}"`,
            );
          }
        }
      });
    }

    expect(offenders).toEqual([]);
  });
});

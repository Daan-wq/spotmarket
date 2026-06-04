import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SOURCE_TARGETS = [
  "src/app/(admin)",
  "src/lib/admin/agency-os.ts",
  "src/lib/admin/campaign-reporting.ts",
  "src/lib/admin/discord-message-validation.ts",
  "src/lib/admin/discord.ts",
];
const ADMIN_MESSAGE_TARGETS = [
  ["navigation", "adminNav"],
  ["dashboard", "admin"],
  ["adminSettings"],
] as const;

const RAW_LOCALE_PATTERN = /\.toLocale(?:String|DateString|TimeString)\(\s*\)/;
const FIXED_NL_FORMAT_PATTERN = /new Intl\.(?:NumberFormat|DateTimeFormat)\(["']nl(?:-[A-Z]{2})?["']/;
const DUTCH_COPY_PATTERNS = [
  /\b(?:Dagelijkse|Kerncijfers|Rapportages|Uitbetalingen|Inzendingen|Opdrachten)\b/,
  /\b(?:Campagnes|Merken|Handleidingen|Signalen|Zoeken|Uitloggen)\b/,
  /\b(?:Geen|Nieuwe|Actieve|Verwachte|Geschatte|Verschuldigde)\b/,
] as const;

function collectFiles(target: string): string[] {
  const absolute = path.join(ROOT, target);
  if (!existsSync(absolute)) return [];

  const stat = statSync(absolute);
  if (stat.isFile()) return isScannableFile(absolute) ? [absolute] : [];

  return readdirSync(absolute).flatMap((entry) => {
    const child = path.join(absolute, entry);
    if (statSync(child).isDirectory()) return collectFiles(path.relative(ROOT, child));
    return isScannableFile(child) ? [child] : [];
  });
}

function isScannableFile(file: string) {
  return (
    (file.endsWith(".ts") || file.endsWith(".tsx")) &&
    !file.endsWith(".test.ts") &&
    !file.endsWith(".test.tsx")
  );
}

function collectMessageValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(collectMessageValues);
}

describe("admin localization guard", () => {
  it("keeps admin formatting locale-aware", () => {
    const offenders: string[] = [];

    for (const file of SOURCE_TARGETS.flatMap(collectFiles)) {
      const relativeFile = path.relative(ROOT, file);
      const lines = readFileSync(file, "utf8").split(/\r?\n/);

      lines.forEach((line, index) => {
        if (RAW_LOCALE_PATTERN.test(line) || FIXED_NL_FORMAT_PATTERN.test(line)) {
          offenders.push(`${relativeFile}:${index + 1} uses fixed or raw locale formatting`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });

  it("keeps English admin message namespaces translated", () => {
    const offenders: string[] = [];
    const messages = JSON.parse(readFileSync(path.join(ROOT, "messages/en.json"), "utf8"));

    for (const target of ADMIN_MESSAGE_TARGETS) {
      const value = target.length === 1 ? messages[target[0]] : messages[target[0]]?.[target[1]];

      for (const copy of collectMessageValues(value)) {
        if (DUTCH_COPY_PATTERNS.some((pattern) => pattern.test(copy))) {
          offenders.push(`${target.join(".")} contains Dutch copy "${copy}"`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

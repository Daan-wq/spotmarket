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
] as const;

const BLOCKED_COPY_PATTERNS = [
  /\bAgency OS\b/,
  /\bCommand Center\b/,
  /\bDaily Action Queue\b/,
  /\bReport history\b/,
  /\bExecutive Summary\b/,
  /\bCampaign Setup\b/,
  /\bPerformance Overview\b/,
  /\bPlatform Breakdown\b/,
  /\bTop Content\b/,
  /\bQuality & Compliance\b/,
  /\bNext Campaign Recommendation\b/,
  /\bPayment requests\b/,
  /\bPayout Runs\b/,
  /\bTotal Referrers\b/,
  /\bTotal Referrals\b/,
  /\bTotal Revenue Shared\b/,
  /\bBack to Networks\b/,
  /\bPending Payouts\b/,
  /\bPayout History\b/,
  /\bJoined Date\b/,
  /\bNo (?:data|entries|source|summary|channel|image|submissions|campaigns|contact details|angle)\b/i,
  /\b(?:Failed to|Could not|Network error|Choose a|Message content|Add message|accepts up to|characters or fewer|needs both)\b/,
  /\b(?:Ready to preview|Send test|Preview and send|Save draft|Save template|Copy wallet|Copy bank|Mark paid)\b/,
  /\b(?:Last proof|Last reviewed|Next review|Trial sent|Trial due)\b/,
  /\b(?:Open campaign|Edit campaign|Unassigned|Unlinked)\b/,
  /\b(?:Draft saved|Template saved|Template deleted|Test message|Message sent)\b/,
  /\b(?:characters sent|buttons ready|Loading Discord|External image|Re-upload required|Current timestamp|Add embed|Add field|Add URL button)\b/,
  /\bAudience requirements\b/,
  /\bSite analytics\b/,
  /\bWeekly Numbers\b/,
  /\bContent Production\b/,
  /\bSubmission\b/,
  /\bCPV\b/,
  /\bOauth Failed\b/,
  /\bInsufficient data\b/,
  /\breach-tests\b/,
] as const;

const BLOCKED_VISIBLE_FIELD_PATTERNS = [
  /\b(header|title|description|label|placeholder|triggerLabel|detail):\s*["'`](Name|Source|Assignment|Assignments|Timeline|Overview|Audience|Submitted|Reviewed|Destination)["'`]/,
  /\b(title|description|label|placeholder|aria-label)=["'`](Name|Source|Assignment|Assignments|Timeline|Overview|Audience|Submitted|Reviewed|Destination)["'`]/,
] as const;

const RAW_LOCALE_PATTERN = /\.toLocale(?:String|DateString|TimeString)\(\s*\)/;
const EN_FORMAT_PATTERN = /new Intl\.(?:NumberFormat|DateTimeFormat)\(["']en(?:-[A-Z]{2})?["']/;

const ALLOWED_LINE_PATTERNS = [
  /"High view growth with near-zero comments and shares": "Hoge viewgroei/,
  /"High view growth with near-zero available engagement": "Hoge viewgroei/,
  /content: "## Medium"/,
  /expect\(result\.content\)\.toBe\("# Medium"\)/,
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

function hasBlockedCopy(line: string) {
  return (
    BLOCKED_COPY_PATTERNS.some((pattern) => pattern.test(line)) ||
    BLOCKED_VISIBLE_FIELD_PATTERNS.some((pattern) => pattern.test(line))
  );
}

function isAllowedLine(line: string) {
  return ALLOWED_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

function collectAdminMessageValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(collectAdminMessageValues);
}

describe("admin localization guard", () => {
  it("keeps visible admin copy Dutch and admin formatting locale-safe", () => {
    const offenders: string[] = [];

    for (const file of SOURCE_TARGETS.flatMap(collectFiles)) {
      const relativeFile = path.relative(ROOT, file);
      const lines = readFileSync(file, "utf8").split(/\r?\n/);

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || isAllowedLine(line)) return;

        if (hasBlockedCopy(line)) {
          offenders.push(`${relativeFile}:${index + 1} contains English admin copy`);
        }

        if (RAW_LOCALE_PATTERN.test(line) || EN_FORMAT_PATTERN.test(line)) {
          offenders.push(`${relativeFile}:${index + 1} uses non-admin locale formatting`);
        }
      });
    }

    for (const localeFile of ["messages/en.json", "messages/nl.json"]) {
      const messages = JSON.parse(readFileSync(path.join(ROOT, localeFile), "utf8"));
      for (const [namespace, key] of ADMIN_MESSAGE_TARGETS) {
        for (const value of collectAdminMessageValues(messages[namespace]?.[key])) {
          if (hasBlockedCopy(value)) {
            offenders.push(`${localeFile}:${namespace}.${key} contains English admin copy "${value}"`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

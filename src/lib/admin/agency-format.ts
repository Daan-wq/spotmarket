export type FormatLocale = "en" | "nl" | string;

export function toIntlLocale(locale: FormatLocale = "nl") {
  return locale === "nl" ? "nl-NL" : "en-US";
}

export function formatCurrency(
  value: number | string | { toString(): string } | null | undefined,
  currency = "EUR",
  locale: FormatLocale = "nl",
) {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

export function formatCurrencyPrecise(
  value: number | string | { toString(): string } | null | undefined,
  currency = "EUR",
  locale: FormatLocale = "nl",
) {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

export function formatNumber(value: number | bigint | null | undefined, locale: FormatLocale = "nl") {
  return new Intl.NumberFormat(toIntlLocale(locale)).format(Number(value ?? 0));
}

export function formatDate(value: Date | string | null | undefined, locale: FormatLocale = "nl") {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(toIntlLocale(locale), { month: "short", day: "numeric", year: "numeric" });
}

export function formatShortDate(value: Date | string | null | undefined, locale: FormatLocale = "nl") {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(toIntlLocale(locale), { month: "short", day: "numeric" });
}

const ENUM_LABELS: Record<string, string> = {
  ACTIVE: "Actief",
  ADDED_TO_DATABASE: "Toegevoegd aan database",
  APPROVED: "Goedgekeurd",
  ARCHIVED: "Gearchiveerd",
  BANK_TRANSFER: "Bankoverschrijving",
  CALL_BOOKED: "Call geboekt",
  CALL_DONE: "Call afgerond",
  CHURNED: "Opgezegd",
  CONFIRMED: "Bevestigd",
  CONTACTED: "Gecontacteerd",
  CRITICAL: "Kritiek",
  CRYPTO: "Crypto",
  DRAFT: "Concept",
  EXPIRED: "Verlopen",
  FAILED: "Mislukt",
  FLAGGED: "Gemarkeerd",
  FOUND: "Gevonden",
  HIGH: "Hoog",
  IN_PROGRESS: "Bezig",
  LEAD: "Lead",
  LOW: "Laag",
  MEDIUM: "Middel",
  NEEDS_REVIEW: "Review nodig",
  NEEDS_REVISION: "Revisie nodig",
  NEGOTIATION: "Onderhandeling",
  NOT_STARTED: "Niet gestart",
  NURTURE_LATER: "Later opvolgen",
  ONBOARDING: "Onboarding",
  PAID: "Betaald",
  PENDING: "In behandeling",
  POSTED: "Geplaatst",
  PORTFOLIO_RECEIVED: "Portfolio ontvangen",
  PROCESSING: "In verwerking",
  PROPOSAL_SENT: "Voorstel verstuurd",
  PROSPECT: "Prospect",
  REJECTED: "Afgekeurd",
  REPLIED: "Gereageerd",
  REVIEWED: "Gereviewd",
  SENT: "Verstuurd",
  SUBMITTED: "Ingediend",
  TRIAL_SENT: "Trial verstuurd",
  TRIAL_SUBMITTED: "Trial ingediend",
  VERIFYING: "Aan het verifieren",
  VERIFIED: "Geverifieerd",
  WARN: "Waarschuwing",
  WON: "Gewonnen",
  LOST: "Verloren",
  BRAND_ONBOARDING: "Merkonboarding",
  CLIPPER_RECRUITMENT: "Clipperrecruitment",
  PRODUCTION: "Productie",
  PAYOUTS: "Uitbetalingen",
  REPORTING: "Rapportage",
  SALES: "Sales",
  QC: "QC",
  OAUTH: "Gekoppeld account",
  MANUAL: "Handmatig",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  YOUTUBE_SHORTS: "YouTube Shorts",
  FACEBOOK: "Facebook",
};

export function titleCaseEnum(value: string | null | undefined) {
  if (!value) return "-";
  const key = value.toUpperCase();
  if (ENUM_LABELS[key]) return ENUM_LABELS[key];
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function toNumber(value: number | string | { toString(): string } | null | undefined): number {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isPast(value: Date | null | undefined, now = new Date()) {
  return Boolean(value && value.getTime() < now.getTime());
}

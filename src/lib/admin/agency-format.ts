export type FormatLocale = "en" | "nl" | string;

export function toIntlLocale(locale: FormatLocale = "en") {
  return locale === "nl" ? "nl-NL" : "en-US";
}

export function formatCurrency(
  value: number | string | { toString(): string } | null | undefined,
  currency = "EUR",
  locale: FormatLocale = "en",
) {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

export function formatCurrencyPrecise(
  value: number | string | { toString(): string } | null | undefined,
  currency = "EUR",
  locale: FormatLocale = "en",
) {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

export function formatNumber(value: number | bigint | null | undefined, locale: FormatLocale = "en") {
  return new Intl.NumberFormat(toIntlLocale(locale)).format(Number(value ?? 0));
}

export function formatDate(value: Date | string | null | undefined, locale: FormatLocale = "en") {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(toIntlLocale(locale), { month: "short", day: "numeric", year: "numeric" });
}

export function formatShortDate(value: Date | string | null | undefined, locale: FormatLocale = "en") {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(toIntlLocale(locale), { month: "short", day: "numeric" });
}

export function titleCaseEnum(value: string | null | undefined) {
  if (!value) return "-";
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

import type { Locale } from "@/i18n/routing";

export function toIntlLocale(locale: Locale | string | undefined): string {
  return locale === "nl" ? "nl-NL" : "en-US";
}

export function formatCurrency(
  value: number,
  locale: Locale | string | undefined = "en",
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatNumber(
  value: number,
  locale: Locale | string | undefined = "en",
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(toIntlLocale(locale), options).format(value);
}

export function formatCompactNumber(
  value: number,
  locale: Locale | string | undefined = "en",
): string {
  return formatNumber(value, locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

export function formatPercent(
  value: number,
  locale: Locale | string | undefined = "en",
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatDate(
  value: Date | string,
  locale: Locale | string | undefined = "en",
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatShortDate(
  value: Date | string,
  locale: Locale | string | undefined = "en",
): string {
  return formatDate(value, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(
  value: Date | string,
  locale: Locale | string | undefined = "en",
): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatRelativeTime(
  value: Date | string,
  locale: Locale | string | undefined = "en",
  now: Date = new Date(),
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = date.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  let unit: Intl.RelativeTimeFormatUnit = "minute";
  let amount = Math.round(diffMs / minute);

  if (absMs >= day) {
    unit = "day";
    amount = Math.round(diffMs / day);
  } else if (absMs >= hour) {
    unit = "hour";
    amount = Math.round(diffMs / hour);
  }

  if (amount === 0) {
    amount = diffMs <= 0 ? -1 : 1;
  }

  return new Intl.RelativeTimeFormat(toIntlLocale(locale), {
    numeric: "auto",
  }).format(amount, unit);
}

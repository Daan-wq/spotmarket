export const LOCALES = ["en", "nl"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const APP_URL_NL = "https://app.clipprofit.nl";
export const APP_URL_EN = "https://app.clipprofit.com";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function getLocaleFromHost(host: string | null | undefined): Locale {
  if (!host) return DEFAULT_LOCALE;

  const normalized = host.toLowerCase().split(":")[0] ?? "";
  if (normalized === "app.clipprofit.nl" || normalized.endsWith(".nl")) {
    return "nl";
  }

  return "en";
}

import {
  APP_URL_EN,
  APP_URL_NL,
  DEFAULT_LOCALE,
  getLocaleFromHost,
  isLocale,
  type Locale,
} from "@/i18n/routing";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getAppUrlForLocale(locale: Locale = DEFAULT_LOCALE): string {
  if (locale === "nl") {
    return normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL_NL ?? APP_URL_NL);
  }

  return normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL_EN ?? APP_URL_EN);
}

export function getAppUrlFromHost(host: string | null | undefined): string {
  return getAppUrlForLocale(getLocaleFromHost(host));
}

export function getLocaleFromRequest(request: Request): Locale {
  const headerLocale = request.headers.get("x-locale");
  if (isLocale(headerLocale)) return headerLocale;

  const host = request.headers.get("x-host") ?? request.headers.get("host");
  return getLocaleFromHost(host);
}

export function getAppUrlFromRequest(request: Request): string {
  const requestUrl = new URL(request.url);
  const host = request.headers.get("host") ?? requestUrl.host;
  const hostname = host.split(":")[0] ?? "";

  if (requestUrl.protocol.startsWith("http") && !LOCAL_HOSTS.has(hostname)) {
    return normalizeBaseUrl(requestUrl.origin);
  }

  return getAppUrlFromHost(host);
}

export function buildAppUrl(path: string, baseUrl: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeBaseUrl(baseUrl)}${normalizedPath}`;
}

import {
  APP_URL_EN,
  DEFAULT_LOCALE,
  getLocaleFromHost,
  isLocale,
  type Locale,
} from "@/i18n/routing";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function normalizeVercelUrl(url: string): string {
  return normalizeBaseUrl(url.startsWith("http") ? url : `https://${url}`);
}

export function getAppUrlForLocale(locale: Locale = DEFAULT_LOCALE): string {
  void locale;
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL_EN ?? APP_URL_EN
  );
}

export function getAppUrlFromHost(host: string | null | undefined): string {
  return getAppUrlForLocale(getLocaleFromHost(host));
}

export function getAppUrlFromHeaders(
  headers: Pick<Headers, "get">,
): string {
  const host = (
    headers.get("x-forwarded-host") ??
    headers.get("x-host") ??
    headers.get("host")
  )?.split(",")[0]?.trim();
  if (!host) return getAppUrlForLocale();

  const hostname = host.split(":")[0] ?? "";
  const protocol = LOCAL_HOSTS.has(hostname)
    ? "http"
    : (headers.get("x-forwarded-proto") ?? "https").split(",")[0]?.trim() ||
      "https";

  return normalizeBaseUrl(`${protocol}://${host}`);
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

export function getAppUrlForSharedLinks(request: Request): string {
  const requestUrl = new URL(request.url);
  const host = request.headers.get("host") ?? requestUrl.host;
  const hostname = host.split(":")[0] ?? "";

  if (LOCAL_HOSTS.has(hostname)) return normalizeBaseUrl(requestUrl.origin);

  if (process.env.VERCEL_ENV === "preview") {
    const vercelUrl = process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL;
    if (vercelUrl) return normalizeVercelUrl(vercelUrl);
  }

  return getAppUrlForLocale(getLocaleFromRequest(request));
}

export function buildAppUrl(path: string, baseUrl: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeBaseUrl(baseUrl)}${normalizedPath}`;
}

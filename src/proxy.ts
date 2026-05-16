import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getLocaleFromHost,
  isLocale,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  type Locale,
} from "@/i18n/routing";

const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/reset-password",
  "/auth/callback",
  "/auth/confirm",
  "/join",
  "/api/",
  "/unauthorized",
  "/privacy",
];

const CANONICAL_APP_HOST = "app.clipprofit.com";
const LEGACY_APP_HOST = "app.clipprofit.nl";

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function applyLocaleHeaders(response: NextResponse, locale: Locale) {
  response.headers.set("Content-Language", locale);
  response.headers.set("x-locale", locale);
  return response;
}

function persistLocaleCookie(response: NextResponse, locale: Locale, cookieLocale: string | undefined) {
  if (!isLocale(cookieLocale)) {
    response.cookies.set(LOCALE_COOKIE_NAME, locale, {
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
      path: "/",
    });
  }
  return response;
}

function createLocalizedNextResponse(headers: Headers, locale: Locale) {
  return applyLocaleHeaders(NextResponse.next({ request: { headers } }), locale);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const hostname = host.toLowerCase().split(":")[0] ?? "";

  if (hostname === LEGACY_APP_HOST) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = "https:";
    canonicalUrl.hostname = CANONICAL_APP_HOST;
    canonicalUrl.port = "";
    return NextResponse.redirect(canonicalUrl, 308);
  }

  const locale = isLocale(cookieLocale) ? cookieLocale : getLocaleFromHost(host);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);
  requestHeaders.set("x-host", host);

  if (pathname.startsWith("/api/")) {
    return persistLocaleCookie(
      createLocalizedNextResponse(requestHeaders, locale),
      locale,
      cookieLocale
    );
  }

  let supabaseResponse = createLocalizedNextResponse(requestHeaders, locale);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: false,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = createLocalizedNextResponse(requestHeaders, locale);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  if (!claims && !isPublicRoute(pathname) && pathname !== "/") {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.searchParams.set("redirect_url", pathname);
    return persistLocaleCookie(
      applyLocaleHeaders(NextResponse.redirect(signInUrl), locale),
      locale,
      cookieLocale
    );
  }

  return persistLocaleCookie(supabaseResponse, locale, cookieLocale);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt|xml)$).*)",
  ],
};

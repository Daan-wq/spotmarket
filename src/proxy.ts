import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getLocaleFromHost,
  isLocale,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  type Locale,
} from "@/i18n/routing";
import {
  AUTH_ATTEMPT_COOKIE_NAME,
  isSafeAuthAttemptId,
  logBrandAuthEvent,
} from "@/lib/brand-auth-events";
import {
  clearSupabaseAuthCookies,
  getSupabaseAuthCookieNames,
  isRecoverableSupabaseSessionError,
} from "@/lib/supabase/auth-cookies";

const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/reset-password",
  "/auth/callback",
  "/auth/confirm",
  "/auth/recovery",
  "/brand-invite",
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

  const authAttemptId = request.cookies.get(AUTH_ATTEMPT_COOKIE_NAME)?.value;
  let claims: Record<string, unknown> | null = null;
  let claimsError: unknown = null;
  let authNetworkError = false;

  try {
    const { data, error } = await supabase.auth.getClaims();
    claims = data?.claims ?? null;
    claimsError = error;
  } catch {
    authNetworkError = true;
    logBrandAuthEvent("warn", {
      event: "network_error",
      attemptId: isSafeAuthAttemptId(authAttemptId)
        ? authAttemptId
        : "server-session-check",
      pathname,
      errorCode: "auth_network_error",
    });
  }

  const recoverableSessionError =
    isRecoverableSupabaseSessionError(claimsError);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const staleCookieNames = recoverableSessionError
    ? getSupabaseAuthCookieNames(request, supabaseUrl)
    : [];

  if (!claims && !isPublicRoute(pathname) && pathname !== "/") {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.search = "";
    signInUrl.searchParams.set(
      "redirect_url",
      `${pathname}${request.nextUrl.search}`,
    );
    if (recoverableSessionError) {
      signInUrl.searchParams.set("session_expired", "1");
    } else if (authNetworkError) {
      signInUrl.searchParams.set("auth_error", "network");
    }
    const redirectResponse = persistLocaleCookie(
      applyLocaleHeaders(NextResponse.redirect(signInUrl), locale),
      locale,
      cookieLocale
    );
    return clearSupabaseAuthCookies(
      redirectResponse,
      staleCookieNames,
    );
  }

  if (recoverableSessionError) {
    clearSupabaseAuthCookies(supabaseResponse, staleCookieNames);
  }

  if (claims && isSafeAuthAttemptId(authAttemptId)) {
    logBrandAuthEvent("info", {
      event: "redirect_succeeded",
      attemptId: authAttemptId,
      pathname,
    });
    supabaseResponse.cookies.set(AUTH_ATTEMPT_COOKIE_NAME, "", {
      expires: new Date(0),
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return persistLocaleCookie(supabaseResponse, locale, cookieLocale);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt|xml)$).*)",
  ],
};

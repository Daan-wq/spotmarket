import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  getLocaleFromHost,
  isLocale,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  type Locale,
} from "@/i18n/routing";
import { assessBanEvasion } from "@/lib/ban-evasion/enforcement";
import { recordAccessSignals } from "@/lib/ban-evasion/store";
import {
  BAN_DEVICE_COOKIE,
  BAN_DEVICE_COOKIE_MAX_AGE,
  createDeviceCookieValue,
  readDeviceCookieValue,
} from "@/lib/ban-evasion/signals";

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

function persistDeviceCookie(response: NextResponse, request: NextRequest) {
  const secret = process.env.BAN_SIGNAL_HASH_SECRET;
  if (!secret) return response;

  const existing = request.cookies.get(BAN_DEVICE_COOKIE)?.value;
  const deviceId = readDeviceCookieValue(existing, secret) ?? randomUUID();
  response.cookies.set(
    BAN_DEVICE_COOKIE,
    createDeviceCookieValue(deviceId, secret),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: BAN_DEVICE_COOKIE_MAX_AGE,
      path: "/",
    },
  );
  return response;
}

function finalizeResponse(
  response: NextResponse,
  request: NextRequest,
  locale: Locale,
  cookieLocale: string | undefined,
) {
  return persistDeviceCookie(
    persistLocaleCookie(response, locale, cookieLocale),
    request,
  );
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

  const isApiRoute = pathname.startsWith("/api/");

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
  const supabaseId = typeof claims?.sub === "string" ? claims.sub : null;
  const appMetadata =
    claims?.app_metadata && typeof claims.app_metadata === "object"
      ? (claims.app_metadata as Record<string, unknown>)
      : null;
  const isCreator = appMetadata?.user_role === "creator";

  if (
    supabaseId &&
    isCreator &&
    (!isPublicRoute(pathname) || isApiRoute)
  ) {
    const assessment = await assessBanEvasion({
      request,
      subjectRole: "creator",
      supabaseId,
    });
    if (assessment.decision !== "ALLOW") {
      if (isApiRoute) {
        if (assessment.decision === "CHALLENGE") {
          return finalizeResponse(
            NextResponse.json(
              {
                error: "Additional verification required.",
                challengeRequired: true,
                siteKey:
                  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
              },
              { status: 428 },
            ),
            request,
            locale,
            cookieLocale,
          );
        }
        return finalizeResponse(
          NextResponse.json(
            { error: "Access unavailable." },
            { status: 403 },
          ),
          request,
          locale,
          cookieLocale,
        );
      }

      const signInUrl = request.nextUrl.clone();
      signInUrl.pathname = "/sign-in";
      signInUrl.search = "";
      signInUrl.searchParams.set(
        "auth_error",
        assessment.decision === "CHALLENGE"
          ? "verification_required"
          : "access_denied",
      );
      return finalizeResponse(
        applyLocaleHeaders(NextResponse.redirect(signInUrl), locale),
        request,
        locale,
        cookieLocale,
      );
    }

    if (!isApiRoute && assessment.observations.length > 0) {
      try {
        await recordAccessSignals({
          supabaseId,
          source: "session",
          observations: assessment.observations,
        });
      } catch (error) {
        console.error("[proxy] Failed to refresh access signals", error);
      }
    }
  }

  if (isApiRoute) {
    return finalizeResponse(
      supabaseResponse,
      request,
      locale,
      cookieLocale,
    );
  }

  if (!claims && !isPublicRoute(pathname) && pathname !== "/") {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.searchParams.set("redirect_url", pathname);
    return finalizeResponse(
      applyLocaleHeaders(NextResponse.redirect(signInUrl), locale),
      request,
      locale,
      cookieLocale,
    );
  }

  return finalizeResponse(supabaseResponse, request, locale, cookieLocale);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt|xml)$).*)",
  ],
};

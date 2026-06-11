import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  AUTH_ATTEMPT_COOKIE_NAME,
  logBrandAuthEvent,
} from "@/lib/brand-auth-events";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { resolveSignInEmail } from "@/lib/sign-in-identifier";
import {
  clearSupabaseAuthCookies,
  getSupabaseAuthCookieNames,
  isSupabaseAuthCookie,
} from "@/lib/supabase/auth-cookies";

const signInSchema = z.object({
  identifier: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(1024),
  redirectUrl: z.string().max(2048).optional(),
  attemptId: z.string().uuid(),
});

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

function errorResponse(
  staleCookieNames: string[],
  payload: { code: string; error: string },
  status: number,
) {
  const response = NextResponse.json(
    { ok: false, ...payload },
    { status },
  );
  return clearSupabaseAuthCookies(response, staleCookieNames);
}

function authErrorDetails(code: string | undefined) {
  switch (code) {
    case "invalid_credentials":
    case "invalid_grant":
      return {
        status: 401,
        code: "INVALID_CREDENTIALS",
        error: "Gebruikersnaam of wachtwoord is onjuist.",
      };
    case "email_not_confirmed":
      return {
        status: 403,
        code: "ACCOUNT_NOT_CONFIRMED",
        error: "Dit account is nog niet geactiveerd.",
      };
    case "over_request_rate_limit":
    case "rate_limit_exceeded":
      return {
        status: 429,
        code: "RATE_LIMITED",
        error: "Te veel inlogpogingen. Wacht even en probeer het opnieuw.",
      };
    default:
      return {
        status: 503,
        code: "AUTH_UNAVAILABLE",
        error: "Inloggen is tijdelijk niet beschikbaar. Probeer het opnieuw.",
      };
  }
}

export async function POST(request: NextRequest) {
  const parsed = signInSchema.safeParse(await request.json().catch(() => null));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!parsed.success || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_REQUEST",
        error: "Controleer de ingevulde gegevens en probeer het opnieuw.",
      },
      { status: 400 },
    );
  }

  const { identifier, password, attemptId } = parsed.data;
  const redirectUrl = safeRedirectPath(parsed.data.redirectUrl, "/");
  const brandFlow = redirectUrl.startsWith("/brand");
  const staleCookieNames = getSupabaseAuthCookieNames(request, supabaseUrl);
  const cookiesForSignIn = request.cookies
    .getAll()
    .filter(({ name }) => !isSupabaseAuthCookie(name, supabaseUrl));
  const pendingCookies: PendingCookie[] = [];

  logBrandAuthEvent("info", {
    event: "submit_started",
    attemptId,
    brandFlow,
    redirectPath: redirectUrl,
  });

  let email: string;
  try {
    email = resolveSignInEmail(identifier);
  } catch {
    logBrandAuthEvent("warn", {
      event: "auth_failed",
      attemptId,
      brandFlow,
      errorCode: "invalid_identifier",
    });
    return errorResponse(
      staleCookieNames,
      {
        code: "INVALID_IDENTIFIER",
        error: "Vul een geldige gebruikersnaam of een geldig e-mailadres in.",
      },
      400,
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: "implicit",
      detectSessionInUrl: false,
    },
    cookies: {
      getAll() {
        return cookiesForSignIn;
      },
      setAll(cookiesToSet) {
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const details = authErrorDetails(error.code);
      logBrandAuthEvent("warn", {
        event: "auth_failed",
        attemptId,
        brandFlow,
        errorCode: error.code ?? "unknown_auth_error",
      });
      return errorResponse(
        staleCookieNames,
        { code: details.code, error: details.error },
        details.status,
      );
    }
  } catch {
    logBrandAuthEvent("warn", {
      event: "network_error",
      attemptId,
      brandFlow,
      errorCode: "auth_network_error",
    });
    return errorResponse(
      staleCookieNames,
      {
        code: "AUTH_NETWORK_ERROR",
        error:
          "Inloggen is tijdelijk niet bereikbaar. Controleer je verbinding en probeer het opnieuw.",
      },
      503,
    );
  }

  const response = NextResponse.json({
    ok: true,
    redirectUrl,
  });
  const pendingNames = new Set(pendingCookies.map(({ name }) => name));
  clearSupabaseAuthCookies(response, staleCookieNames, pendingNames);
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options);
  }
  response.cookies.set(AUTH_ATTEMPT_COOKIE_NAME, attemptId, {
    httpOnly: true,
    maxAge: 120,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  logBrandAuthEvent("info", {
    event: "auth_succeeded",
    attemptId,
    brandFlow,
    redirectPath: redirectUrl,
  });

  return response;
}

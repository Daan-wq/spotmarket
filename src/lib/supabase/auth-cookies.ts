import type { NextRequest, NextResponse } from "next/server";

const RECOVERABLE_REFRESH_CODES = new Set([
  "refresh_token_already_used",
  "refresh_token_not_found",
]);

export function getSupabaseAuthCookiePrefix(supabaseUrl: string) {
  try {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

export function isSupabaseAuthCookie(name: string, supabaseUrl: string) {
  const prefix = getSupabaseAuthCookiePrefix(supabaseUrl);
  return Boolean(prefix && (name === prefix || name.startsWith(`${prefix}.`)));
}

export function getSupabaseAuthCookieNames(
  request: NextRequest,
  supabaseUrl: string,
) {
  return request.cookies
    .getAll()
    .filter(({ name }) => isSupabaseAuthCookie(name, supabaseUrl))
    .map(({ name }) => name);
}

export function clearSupabaseAuthCookies(
  response: NextResponse,
  cookieNames: string[],
  preservedNames: ReadonlySet<string> = new Set(),
) {
  for (const name of cookieNames) {
    if (preservedNames.has(name)) continue;

    response.cookies.set(name, "", {
      expires: new Date(0),
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export function isRecoverableSupabaseSessionError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code =
    "code" in error && typeof error.code === "string" ? error.code : "";
  if (RECOVERABLE_REFRESH_CODES.has(code)) return true;

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  return [...RECOVERABLE_REFRESH_CODES].some((value) =>
    message.includes(value),
  );
}

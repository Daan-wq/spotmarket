import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import {
  getAuthEmailLocale,
  sendAuthEmail,
} from "@/lib/auth-email";
import {
  buildAppUrl,
  getAppUrlFromRequest,
} from "@/lib/app-url";
import {
  AUTH_LIMIT,
  getClientIp,
  rateLimit,
} from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const passwordResetSchema = z.object({
  email: z.string().trim().email(),
});

function successResponse(headers: Record<string, string>) {
  return NextResponse.json({ success: true }, { headers });
}

export async function POST(request: Request) {
  const locale = getAuthEmailLocale(request);
  const t = await getTranslations({ locale, namespace: "auth.api" });
  const limit = rateLimit(
    `password_reset_${getClientIp(request)}`,
    AUTH_LIMIT,
  );

  if (!limit.success) {
    return NextResponse.json(
      { error: t("rateLimited") },
      { status: 429, headers: limit.headers },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: t("invalidInput") },
      { status: 400, headers: limit.headers },
    );
  }

  const parsed = passwordResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: t("invalidInput") },
      { status: 400, headers: limit.headers },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const appUrl = getAppUrlFromRequest(request);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: buildAppUrl("/reset-password", appUrl),
    },
  });

  if (error?.code === "user_not_found" || error?.status === 404) {
    return successResponse(limit.headers);
  }

  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    console.error("[password-reset] Recovery link generation failed", {
      code: error?.code,
      status: error?.status,
    });
    return NextResponse.json(
      { error: t("passwordResetFailed") },
      { status: 500, headers: limit.headers },
    );
  }

  const recoveryUrl = buildAppUrl(
    `/auth/recovery?token_hash=${encodeURIComponent(tokenHash)}`,
    appUrl,
  );

  try {
    await sendAuthEmail({
      kind: "passwordRecovery",
      locale,
      actionUrl: recoveryUrl,
      to: email,
    });
  } catch (sendError) {
    console.error("[password-reset] Recovery email delivery failed", {
      message:
        sendError instanceof Error ? sendError.message : "Unknown email error",
    });
    return NextResponse.json(
      { error: t("passwordResetFailed") },
      { status: 500, headers: limit.headers },
    );
  }

  return successResponse(limit.headers);
}

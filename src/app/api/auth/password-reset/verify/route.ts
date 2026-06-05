import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { getLocaleFromRequest } from "@/lib/app-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const recoverySchema = z.object({
  tokenHash: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const locale = getLocaleFromRequest(request);
  const t = await getTranslations({ locale, namespace: "auth.api" });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: t("invalidInput") },
      { status: 400 },
    );
  }

  const parsed = recoverySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: t("invalidInput") },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.tokenHash,
    type: "recovery",
  });

  if (error || !data.session) {
    return NextResponse.json(
      { error: t("recoveryFailed") },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}

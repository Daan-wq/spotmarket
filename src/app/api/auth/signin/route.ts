import { NextResponse } from "next/server";
import { z } from "zod";
import { assessBanEvasion } from "@/lib/ban-evasion/enforcement";
import { getIdentitySignalsForSupabaseUser } from "@/lib/ban-evasion/identity-signals";
import { recordAccessSignals } from "@/lib/ban-evasion/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
  turnstileToken: z.string().max(4096).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
  });
  if (error || !data.user || !data.session) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const identity = await getIdentitySignalsForSupabaseUser(data.user.id);
  const assessment = await assessBanEvasion({
    request,
    subjectRole: identity.role ?? "creator",
    supabaseId: data.user.id,
    identitySignals: identity.signals,
    turnstileToken: parsed.data.turnstileToken,
  });

  if (assessment.decision !== "ALLOW") {
    await supabase.auth.signOut({ scope: "global" });
    if (assessment.decision === "CHALLENGE") {
      return NextResponse.json(
        {
          challengeRequired: true,
          siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
        },
        { status: 428 },
      );
    }
    return NextResponse.json(
      { error: "Access unavailable." },
      { status: 403 },
    );
  }

  if (identity.role === "creator") {
    try {
      await recordAccessSignals({
        supabaseId: data.user.id,
        userId: identity.userId,
        source: "signin",
        observations: assessment.observations,
      });
    } catch (recordError) {
      console.error("[signin] Failed to record access signals", recordError);
    }
  }

  return NextResponse.json({ success: true });
}

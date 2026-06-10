import { NextResponse } from "next/server";
import { z } from "zod";
import { assessBanEvasion } from "@/lib/ban-evasion/enforcement";
import {
  BAN_CHALLENGE_COOKIE,
  BAN_CHALLENGE_COOKIE_MAX_AGE,
  createChallengeProofValue,
} from "@/lib/ban-evasion/signals";

const schema = z.object({
  turnstileToken: z.string().max(4096).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await assessBanEvasion({
    request,
    subjectRole: "creator",
    turnstileToken: parsed.data.turnstileToken,
  });

  if (result.decision === "BLOCK") {
    return NextResponse.json(
      { error: "Access unavailable." },
      { status: 403 },
    );
  }

  if (result.decision === "CHALLENGE") {
    return NextResponse.json(
      {
        challengeRequired: true,
        siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
      },
      { status: 428 },
    );
  }

  const response = NextResponse.json({ success: true });
  if (parsed.data.turnstileToken && process.env.BAN_SIGNAL_HASH_SECRET) {
    response.cookies.set(
      BAN_CHALLENGE_COOKIE,
      createChallengeProofValue(),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: BAN_CHALLENGE_COOKIE_MAX_AGE,
        path: "/",
      },
    );
  }
  return response;
}

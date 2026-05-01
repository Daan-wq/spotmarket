import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { extractDiscordIdentity } from "@/lib/discord-identity";

const TRON_REGEX = /^T[1-9A-HJ-NP-Z]{33}$/;
const VALID_ROLES = ["creator"] as const;

function generateReferralCode(): string {
  return nanoid(8).toUpperCase();
}

async function uniqueReferralCode(): Promise<string> {
  let code = generateReferralCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
    code = generateReferralCode();
    attempts++;
  }
  return code;
}

export async function POST(req: Request) {
  try {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const displayName = (body.displayName as string)?.trim();
  const refCode = (body.referralCode as string | undefined)?.trim().toUpperCase();
  const tronsAddress = (body.tronsAddress as string | undefined)?.trim();
  const role = body.role as string | undefined;
  const attributionSource = (body.attributionSource as string | undefined)?.trim();
  const experienceLevel = (body.experienceLevel as string | undefined)?.trim();
  const portfolioVideoUrl = (body.portfolioVideoUrl as string | undefined)?.trim();

  if (!displayName) {
    return NextResponse.json({ error: "Display name is required" }, { status: 400 });
  }

  if (tronsAddress && !TRON_REGEX.test(tronsAddress)) {
    return NextResponse.json({ error: "Invalid Tron wallet address" }, { status: 400 });
  }

  const selectedRole = role && VALID_ROLES.includes(role as typeof VALID_ROLES[number])
    ? (role as typeof VALID_ROLES[number])
    : "creator";

  // Resolve referrer (only creators can be referrers)
  let referredById: string | undefined;
  if (refCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: refCode },
      select: { id: true, role: true },
    });
    if (referrer && referrer.role === "creator") {
      referredById = referrer.id;
    }
  }

  const referralCode = await uniqueReferralCode();

  // Handle re-signup: if a User record exists for this email with a stale supabaseId, update it
  const existingByEmail = await prisma.user.findUnique({ where: { email: authUser.email ?? "" } });
  if (existingByEmail && existingByEmail.supabaseId !== authUser.id) {
    await prisma.user.update({ where: { id: existingByEmail.id }, data: { supabaseId: authUser.id } });
  }

  const admin = createSupabaseAdminClient();
  await admin.auth.admin.updateUserById(authUser.id, {
    user_metadata: { role: selectedRole },
  });

  // Pull Discord identity from auth.identities (canonical) — works whether the user
  // signed up with Discord directly or linked it later via the /api/auth/discord flow.
  const discordIdentity = extractDiscordIdentity(authUser);

  const user = await prisma.user.upsert({
    where: { supabaseId: authUser.id },
    update: {
      role: selectedRole,
      ...(discordIdentity
        ? { discordId: discordIdentity.discordId, discordUsername: discordIdentity.discordUsername }
        : {}),
    },
    create: {
      supabaseId: authUser.id,
      email: authUser.email ?? "",
      role: selectedRole,
      referralCode,
      referredBy: referredById,
      ...(discordIdentity
        ? { discordId: discordIdentity.discordId, discordUsername: discordIdentity.discordUsername }
        : {}),
    },
    include: { creatorProfile: true },
  });

  if (!user.creatorProfile) {
    await prisma.creatorProfile.create({
      data: {
        userId: user.id,
        displayName,
        tronsAddress: tronsAddress ?? null,
        attributionSource: attributionSource ?? null,
        experienceLevel: experienceLevel ?? null,
        portfolioVideoUrl: portfolioVideoUrl ?? null,
      },
    });
  } else {
    await prisma.creatorProfile.update({
      where: { userId: user.id },
      data: {
        ...(tronsAddress ? { tronsAddress } : {}),
        ...(attributionSource ? { attributionSource } : {}),
        ...(experienceLevel ? { experienceLevel } : {}),
        ...(portfolioVideoUrl ? { portfolioVideoUrl } : {}),
      },
    });
  }

  return NextResponse.json({ success: true, redirect: "/creator/dashboard" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[onboarding/complete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

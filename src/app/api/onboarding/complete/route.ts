import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

const TRON_REGEX = /^T[1-9A-HJ-NP-Z]{33}$/;

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
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const displayName = (body.displayName as string)?.trim();
  const refCode = (body.referralCode as string | undefined)?.trim().toUpperCase();
  const tronsAddress = (body.tronsAddress as string | undefined)?.trim();

  if (!displayName) {
    return NextResponse.json({ error: "Display name is required" }, { status: 400 });
  }

  if (tronsAddress && !TRON_REGEX.test(tronsAddress)) {
    return NextResponse.json({ error: "Invalid Tron wallet address" }, { status: 400 });
  }

  // Resolve referrer
  let referredById: string | undefined;
  if (refCode) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: refCode } });
    if (referrer) referredById = referrer.id;
  }

  const referralCode = await uniqueReferralCode();

  const admin = createSupabaseAdminClient();
  await admin.auth.admin.updateUserById(authUser.id, {
    user_metadata: { role: "user" },
  });

  const user = await prisma.user.upsert({
    where: { supabaseId: authUser.id },
    update: { role: "user" },
    create: {
      supabaseId: authUser.id,
      email: authUser.email ?? "",
      role: "user",
      referralCode,
      referredBy: referredById,
    },
    include: { creatorProfile: true },
  });

  if (!user.creatorProfile) {
    await prisma.creatorProfile.create({
      data: {
        userId: user.id,
        displayName,
        tronsAddress: tronsAddress ?? null,
      },
    });
  } else if (tronsAddress) {
    await prisma.creatorProfile.update({
      where: { userId: user.id },
      data: { tronsAddress },
    });
  }

  return NextResponse.json({ success: true, redirect: "/dashboard" });
}

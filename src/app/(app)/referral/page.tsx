import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ReferralClient } from "./referral-client";

export default async function ReferralPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: {
      id: true,
      referralCode: true,
      referralEarnings: true,
      referralPayouts: {
        select: {
          id: true,
          referredUserId: true,
          amount: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!dbUser) redirect("/onboarding");

  // Fetch referred users' display names
  const referredUserIds = [...new Set(dbUser.referralPayouts.map(p => p.referredUserId))];
  const referredUsers = await prisma.user.findMany({
    where: { id: { in: referredUserIds } },
    select: {
      id: true,
      creatorProfile: { select: { displayName: true } },
      advertiserProfile: { select: { brandName: true } },
    },
  });

  const nameMap = Object.fromEntries(
    referredUsers.map(u => [
      u.id,
      u.creatorProfile?.displayName ?? u.advertiserProfile?.brandName ?? "Unknown",
    ])
  );

  // Get total referred signups
  const referredCount = await prisma.user.count({
    where: { referredBy: dbUser.id },
  });

  const payouts = dbUser.referralPayouts.map(p => ({
    ...p,
    amount: Number(p.amount),
    referredUserName: nameMap[p.referredUserId] ?? "Unknown",
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <ReferralClient
      referralCode={dbUser.referralCode ?? null}
      totalEarnings={Number(dbUser.referralEarnings)}
      referredCount={referredCount}
      payouts={payouts}
    />
  );
}

import { getCachedAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileClient } from "./_components/profile-client";
import { ScoreCard } from "@/components/clipper-score/score-card";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const authUser = await getCachedAuthUser();
  if (!authUser) redirect("/sign-in");

  const [params, user] = await Promise.all([
    searchParams,
    prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      include: {
        creatorProfile: {
          include: {
            payouts: {
              select: {
                id: true,
                amount: true,
                status: true,
                currency: true,
                paymentMethod: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    }),
  ]);

  const profile = user?.creatorProfile;
  if (!profile) redirect("/onboarding");

  // Calculate balances
  const payouts = profile.payouts ?? [];
  const availableBalance = payouts
    .filter((p) => p.status === "confirmed")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingBalance = payouts
    .filter((p) => p.status === "pending" || p.status === "processing")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const withdrawalHistory = payouts.map((p) => ({
    id: p.id,
    date: p.createdAt.toISOString(),
    grossAmount: Number(p.amount),
    status: p.status,
    method: p.paymentMethod ?? "—",
  }));

  return (
    <div className="w-full">
      <div className="px-6 pt-6">
        <ScoreCard creatorProfileId={profile.id} />
      </div>
      <ProfileClient
        initialTab={params.tab ?? "general"}
        profileData={{
          displayName: profile.displayName,
          email: authUser.email ?? "",
          avatarUrl: profile.avatarUrl,
          bio: profile.bio,
          primaryGeo: profile.primaryGeo,
          experienceLevel: profile.experienceLevel,
          memberSince: user.createdAt.toISOString(),
        }}
        balanceData={{
          available: availableBalance,
          pending: pendingBalance,
          withdrawalHistory,
        }}
      />
    </div>
  );
}

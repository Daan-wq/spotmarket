import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { getInstagramProfile, getMediaInsights, computeEngagementRate } from "@/lib/instagram";
import { updateCreatorAggregateStats } from "@/lib/creator-stats";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { creatorId } = await params;
  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: { select: { id: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const isAdmin = user.role === "admin";
  const isOwner = user.creatorProfile?.id === creatorId;
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const accounts = await prisma.socialAccount.findMany({ where: { creatorProfileId: creatorId, isActive: true } });
  const results: Record<string, string> = {};

  for (const account of accounts) {
    try {
      if (account.platform === "instagram") {
        const accessToken = decrypt(account.accessToken, account.accessTokenIv);
        const profile = await getInstagramProfile(accessToken);
        const insights = await getMediaInsights(profile.id, accessToken, 20);
        const engagementRate = computeEngagementRate(insights, profile.followerCount);

        await prisma.socialAccount.update({ where: { id: account.id }, data: { followerCount: profile.followerCount, engagementRate, lastSyncedAt: new Date() } });
        results[`${account.platform}:${account.platformUsername}`] = "synced";
      }
    } catch (err) {
      results[`${account.platform}:${account.platformUsername}`] = `error: ${err instanceof Error ? err.message : "unknown"}`;
    }
  }

  // Recalculate aggregate stats across all accounts
  await updateCreatorAggregateStats(creatorId);

  return NextResponse.json({ results, syncedAt: new Date().toISOString() });
}

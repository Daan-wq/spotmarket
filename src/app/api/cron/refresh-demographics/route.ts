import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { verifyCron } from "@/lib/cron-auth";
import {
  fetchInstagramProfile,
  fetchDemographicSnapshots,
  fetchRecentMedia,
  computeEngagementRate,
  computeDemographicStats,
} from "@/lib/instagram";

/**
 * Weekly cron: refresh demographics and profile data for active Instagram accounts.
 * Fetches profile, recent media, and normalized demographic snapshots (v25.0).
 * Also writes igDemographics JSON cache for backward compat with campaign matching.
 * Triggered by Vercel Cron every Sunday at 02:00 UTC.
 *
 * Rate limiting: 40 accounts per run
 */
export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.socialAccount.findMany({
    where: { platform: "instagram", isActive: true },
    select: {
      id: true,
      platformUserId: true,
      accessToken: true,
      accessTokenIv: true,
      followerCount: true,
      creatorProfileId: true,
    },
    take: 40,
  });

  const results = { updated: 0, failed: 0, errors: [] as string[] };

  for (const account of accounts) {
    try {
      const accessToken = decrypt(account.accessToken, account.accessTokenIv);
      const igUserId = account.platformUserId;

      const profile = await fetchInstagramProfile(accessToken, igUserId);
      const media = await fetchRecentMedia(accessToken, igUserId);
      const engagementRate = computeEngagementRate(
        media.map((m) => ({
          mediaId: m.id,
          likeCount: m.like_count,
          commentCount: m.comments_count,
          impressions: 0,
          reach: 0,
          videoViews: 0,
        })),
        profile.followersCount
      );

      const now = new Date();
      const snapshotDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

      // Fetch normalized demographics (v25.0) only for accounts with 100+ followers
      let legacyDemographics = null;
      if (profile.followersCount >= 100) {
        try {
          const { rows, legacyJson } = await fetchDemographicSnapshots(igUserId, accessToken);
          legacyDemographics = legacyJson;

          // Upsert normalized DemographicSnapshot rows
          for (const row of rows) {
            await prisma.demographicSnapshot.upsert({
              where: {
                socialAccountId_snapshotDate_demographicType_breakdownKey_breakdownValue: {
                  socialAccountId: account.id,
                  snapshotDate,
                  demographicType: row.demographicType,
                  breakdownKey: row.breakdownKey,
                  breakdownValue: row.breakdownValue,
                },
              },
              create: {
                socialAccountId: account.id,
                snapshotDate,
                demographicType: row.demographicType,
                breakdownKey: row.breakdownKey,
                breakdownValue: row.breakdownValue,
                value: row.value,
              },
              update: { value: row.value },
            });
          }
        } catch (err) {
          console.warn(
            `[cron/refresh-demographics] Demographics failed for ${account.id}: ${
              err instanceof Error ? err.message : "unknown"
            }`
          );
        }
      }

      // Update social account: profile data + legacy demographics JSON cache
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          igName: profile.name,
          igBio: profile.biography,
          igProfilePicUrl: profile.profilePictureUrl,
          igFollowsCount: profile.followsCount,
          igWebsite: profile.website,
          followerCount: profile.followersCount,
          engagementRate,
          igMediaCache: media.length > 0 ? JSON.parse(JSON.stringify(media)) : undefined,
          ...(legacyDemographics && {
            igDemographics: JSON.parse(JSON.stringify(legacyDemographics)),
            igDemographicsUpdatedAt: now,
          }),
          lastSyncedAt: now,
        },
      });

      // Update creator profile with computed stats
      if (account.creatorProfileId) {
        const computed = computeDemographicStats(legacyDemographics);
        await prisma.creatorProfile.update({
          where: { id: account.creatorProfileId },
          data: {
            totalFollowers: profile.followersCount,
            engagementRate,
            avatarUrl: profile.profilePictureUrl || undefined,
            bestEngagementRate: engagementRate,
            ...(computed.topCountry && { topCountry: computed.topCountry }),
            ...(computed.topCountryPercent !== null && { topCountryPercent: computed.topCountryPercent }),
            ...(computed.malePercent !== null && { malePercent: computed.malePercent }),
            ...(computed.age18PlusPercent !== null && { age18PlusPercent: computed.age18PlusPercent }),
          },
        });
      }

      results.updated++;
    } catch (err) {
      results.failed++;
      results.errors.push(
        `${account.id}: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }

  console.log("[cron/refresh-demographics]", results);
  return NextResponse.json(results);
}

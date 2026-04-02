/**
 * Role migration script — run once to flatten creator/advertiser/network → user
 *
 * Usage:
 *   npx tsx scripts/migrate-roles.ts
 *
 * What it does:
 *  1. Updates all creator, advertiser, network users to role = 'user'
 *  2. Ensures every user has a CreatorProfile (creates one if missing)
 *  3. Copies advertiser brandName → CreatorProfile.displayName where no profile exists
 *  4. Nulls out Campaign.advertiserId (decouples from AdvertiserProfile)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting role migration...\n");

  // 1. Flatten roles
  const { count: updatedUsers } = await prisma.user.updateMany({
    where: { role: { in: ["creator", "advertiser", "network"] } },
    data: { role: "user" },
  });
  console.log(`✓ Updated ${updatedUsers} users to role='user'`);

  // 2. Create CreatorProfile for users who don't have one
  const usersWithoutProfile = await prisma.user.findMany({
    where: { creatorProfile: null },
    include: { advertiserProfile: true },
  });

  for (const user of usersWithoutProfile) {
    const displayName =
      user.advertiserProfile?.brandName ??
      user.email.split("@")[0] ??
      "User";

    await prisma.creatorProfile.create({
      data: { userId: user.id, displayName },
    });
    console.log(`  Created CreatorProfile for user ${user.email} ("${displayName}")`);
  }
  console.log(`✓ Created ${usersWithoutProfile.length} missing CreatorProfiles`);

  // 3. Null out Campaign.advertiserId so AdvertiserProfile can be safely removed later
  const { count: updatedCampaigns } = await prisma.campaign.updateMany({
    where: { advertiserId: { not: null } },
    data: { advertiserId: null },
  });
  console.log(`✓ Cleared advertiserId on ${updatedCampaigns} campaigns`);

  console.log("\nMigration complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

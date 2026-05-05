import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pricing = await prisma.pricingPackageTemplate.upsert({
    where: { id: "seed-pricing-starter" },
    update: {},
    create: {
      id: "seed-pricing-starter",
      name: "Starter launch",
      description: "Entry package for a brand that needs a first clip batch and simple weekly reporting.",
      price: 2500,
      currency: "EUR",
      platforms: ["INSTAGRAM", "TIKTOK"],
      includedClips: 20,
      includedViews: 500000,
      creatorRatePerClip: 35,
      businessCpv: 0.008,
      marginPercent: 35,
      sortOrder: 10,
      notes: "Use as the default offer for new brand discovery calls.",
    },
  });

  await prisma.contractDocument.upsert({
    where: { id: "seed-document-service-agreement" },
    update: {},
    create: {
      id: "seed-document-service-agreement",
      title: "Starter launch service agreement",
      type: "CONTRACT",
      status: "ACTIVE",
      owner: "Operations",
      effectiveAt: new Date("2026-05-01"),
      renewalAt: new Date("2026-06-01"),
      externalUrl: "https://example.com/contracts/starter-launch",
      fileName: "starter-launch-agreement.pdf",
      notes: `Sample tracker row connected to ${pricing.name}.`,
    },
  });

  await prisma.weeklyBusinessSnapshot.upsert({
    where: {
      weekStart_weekEnd: {
        weekStart: new Date("2026-04-27"),
        weekEnd: new Date("2026-05-03"),
      },
    },
    update: {},
    create: {
      weekStart: new Date("2026-04-27"),
      weekEnd: new Date("2026-05-03"),
      status: "SAVED",
      revenueBooked: 2500,
      expectedRevenue: 4000,
      creatorCost: 700,
      payoutOwed: 700,
      estimatedProfit: 1100,
      activeBrands: 1,
      activeClippers: 4,
      clipsDelivered: 20,
      clipsApproved: 16,
      clipsRejectedOrRevised: 4,
      openRisks: 1,
      notes: "Seed snapshot for reports history verification.",
      createdBy: "seed",
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

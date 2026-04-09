import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });
const c = await p.campaign.findFirst({
  where: { name: { contains: 'monbet', mode: 'insensitive' } },
  select: {
    name: true, otherNotes: true, contentType: true, niche: true,
    targetCountry: true, requirements: true, minAge: true,
    pageStats: true, platforms: true,
  },
});
console.log(JSON.stringify(c, null, 2));
await p.$disconnect();

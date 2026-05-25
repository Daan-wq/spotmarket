import { backfillSubmissionVideoIdentities } from "../src/lib/backfill-submission-video-identities";
import { prisma } from "../src/lib/prisma";

function readFlag(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

async function main() {
  const limit = Number(readFlag("limit") ?? "1000");
  const dryRun = !process.argv.includes("--apply");

  const result = await backfillSubmissionVideoIdentities({
    limit: Number.isFinite(limit) && limit > 0 ? limit : 1000,
    dryRun,
  });

  console.log(JSON.stringify(result, null, 2));

  if (dryRun && result.duplicateGroups.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

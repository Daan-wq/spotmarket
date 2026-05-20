import { backfillSubmissionThumbnails } from "../src/lib/backfill-submission-thumbnails";
import { prisma } from "../src/lib/prisma";

function readFlag(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

async function main() {
  const limit = Number(readFlag("limit") ?? "500");
  const dryRun = process.argv.includes("--dry-run");

  const result = await backfillSubmissionThumbnails({
    limit: Number.isFinite(limit) && limit > 0 ? limit : 500,
    dryRun,
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

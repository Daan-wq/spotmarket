import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const jitiBin = join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "jiti.cmd" : "jiti",
);

const result = spawnSync(
  jitiBin,
  [join("scripts", "backfill-submission-thumbnails.ts"), ...process.argv.slice(2)],
  {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

process.exit(result.status ?? 1);

import { readdir, copyFile, mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { REPO_ROOT } from "./lib/write.js";

/**
 * Mirrors every canonical JSON artifact from `data/` to `frontend/public/data/`.
 *
 * Most generated files (cruises.json, forecast.json) are already dual-written
 * by their owning scripts via `writeDataFile`, but this script exists to handle
 * two cases:
 *  1. Hand-authored files (zones.json, recommendations.json) that no script
 *     produces.
 *  2. Full-resync recovery — e.g. if the frontend directory gets replaced or
 *     `frontend/public/data/` is wiped, `npm run sync` re-populates everything
 *     without re-running scrape or forecast.
 *
 * Non-JSON files (README.md, zones.geojson) are intentionally NOT mirrored;
 * they're dev-only artifacts.
 */

const SRC = resolve(REPO_ROOT, "data");
const DST = resolve(REPO_ROOT, "public", "data");

async function main(): Promise<void> {
  await mkdir(DST, { recursive: true });
  const files = await readdir(SRC);
  let synced = 0;
  for (const name of files) {
    if (!name.endsWith(".json")) continue;
    const srcPath = resolve(SRC, name);
    const dstPath = resolve(DST, name);
    const s = await stat(srcPath);
    if (!s.isFile()) continue;
    await copyFile(srcPath, dstPath);
    console.log(`✓ ${name} → ${dstPath}`);
    synced += 1;
  }
  console.log(`\nSynced ${synced} file(s).`);
}

main().catch((err) => {
  console.error("✗ sync failed:", err);
  process.exit(1);
});

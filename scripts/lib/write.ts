import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, "..", "..");

const PRIMARY_DATA_DIR = resolve(REPO_ROOT, "data");
const FRONTEND_DATA_DIR = resolve(REPO_ROOT, "public", "data");

/**
 * Writes a JSON artifact to BOTH the canonical `data/` directory and the
 * Next.js `public/data/` mirror so the frontend can fetch it at
 * `/data/<name>.json` without any extra build step.
 */
export async function writeDataFile(name: string, payload: unknown): Promise<void> {
  const json = JSON.stringify(payload, null, 2) + "\n";

  await Promise.all([
    mkdir(PRIMARY_DATA_DIR, { recursive: true }).then(() =>
      writeFile(resolve(PRIMARY_DATA_DIR, name), json, "utf8"),
    ),
    mkdir(FRONTEND_DATA_DIR, { recursive: true }).then(() =>
      writeFile(resolve(FRONTEND_DATA_DIR, name), json, "utf8"),
    ),
  ]);
}

export function paths(name: string): { primary: string; mirror: string } {
  return {
    primary: resolve(PRIMARY_DATA_DIR, name),
    mirror: resolve(FRONTEND_DATA_DIR, name),
  };
}

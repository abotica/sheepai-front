import { parseCruisePage } from "./lib/parser.js";
import { CruisesFileSchema, type CruisesFile } from "./lib/types.js";
import { paths, writeDataFile } from "./lib/write.js";

const SOURCE_URL =
  "https://www.cruisetimetables.com/split-croatia-cruise-ship-schedule-2026.html";
const YEAR = 2026;
const SOURCE_NAME = "cruisetimetables.com";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) BrodAlarm/0.1 (+https://github.com/martinmlcoch/sheep-hackaton)";

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) {
    throw new Error(`Source ${url} returned ${res.status} ${res.statusText}`);
  }
  return res.text();
}

async function main(): Promise<void> {
  console.log(`→ fetching ${SOURCE_URL}`);
  const html = await fetchHtml(SOURCE_URL);
  console.log(`  ${html.length.toLocaleString()} bytes received`);

  console.log(`→ parsing schedule for ${YEAR}`);
  const ships = parseCruisePage(html, YEAR);
  console.log(`  ${ships.length} ship arrivals parsed`);

  const payload: CruisesFile = {
    $schema_version: 1,
    generated_at: new Date().toISOString(),
    source: SOURCE_NAME,
    year: YEAR,
    ships,
  };

  console.log(`→ validating against schema`);
  CruisesFileSchema.parse(payload);

  await writeDataFile("cruises.json", payload);
  const out = paths("cruises.json");
  console.log(`✓ wrote ${out.primary}`);
  console.log(`✓ wrote ${out.mirror}`);

  const totalPassengers = ships.reduce((acc, s) => acc + s.passengers, 0);
  const datesWithShips = new Set(ships.map((s) => s.date)).size;
  console.log(`\nSummary:`);
  console.log(`  ships:              ${ships.length}`);
  console.log(`  distinct dates:     ${datesWithShips}`);
  console.log(`  total passengers:   ${totalPassengers.toLocaleString()}`);
  if (ships.length > 0) {
    const first = ships[0]!;
    const last = ships[ships.length - 1]!;
    console.log(`  first arrival:      ${first.date} ${first.ship_name}`);
    console.log(`  last arrival:       ${last.date} ${last.ship_name}`);
  }
}

main().catch((err) => {
  console.error("✗ scrape failed:", err);
  process.exit(1);
});

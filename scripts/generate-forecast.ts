import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  CruisesFileSchema,
  ZonesFileSchema,
  ForecastFileSchema,
  type ForecastFile,
  type ForecastTimeSlot,
  type Weather,
} from "./lib/types.js";
import {
  allocateLoad,
  levelFromDensity,
  resolveShipWindow,
  weatherBucket,
} from "./lib/heuristic.js";
import { polygonAreaM2 } from "./lib/geo.js";
import { paths, writeDataFile, REPO_ROOT } from "./lib/write.js";

const SPLIT_LAT = 43.5081;
const SPLIT_LNG = 16.4402;

const SLOT_MINUTES = 30;
const HORIZON_DAYS = 7;

interface OpenMeteoResponse {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    wind_speed_10m?: number[];
    precipitation?: number[];
  };
}

async function fetchWeather(
  startDate: string,
  endDate: string,
): Promise<Map<string, Weather>> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${SPLIT_LAT}` +
    `&longitude=${SPLIT_LNG}` +
    `&hourly=temperature_2m,wind_speed_10m,precipitation` +
    `&start_date=${startDate}` +
    `&end_date=${endDate}` +
    `&timezone=Europe%2FZagreb`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  open-meteo returned ${res.status}, skipping weather`);
      return new Map();
    }
    const data = (await res.json()) as OpenMeteoResponse;
    const times = data.hourly?.time ?? [];
    const temps = data.hourly?.temperature_2m ?? [];
    const winds = data.hourly?.wind_speed_10m ?? [];
    const precs = data.hourly?.precipitation ?? [];

    const map = new Map<string, Weather>();
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      if (!t) continue;
      const localIso = `${t}:00+02:00`;
      map.set(localIso, {
        temp_c: temps[i] ?? 0,
        wind_kmh: winds[i] ?? 0,
        precip_mm: precs[i] ?? 0,
      });
    }
    return map;
  } catch (err) {
    console.warn(`  open-meteo fetch failed: ${(err as Error).message}`);
    return new Map();
  }
}

function nearestHourKey(slot: Date): string {
  const hour = new Date(slot.getTime());
  hour.setUTCMinutes(0, 0, 0);
  const offsetMs = 2 * 3600 * 1000;
  const local = new Date(hour.getTime() + offsetMs);
  const yyyy = local.getUTCFullYear();
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(local.getUTCDate()).padStart(2, "0");
  const hh = String(local.getUTCHours()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:00:00+02:00`;
}

function formatSlotIso(slot: Date): string {
  const offsetMs = 2 * 3600 * 1000;
  const local = new Date(slot.getTime() + offsetMs);
  const yyyy = local.getUTCFullYear();
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(local.getUTCDate()).padStart(2, "0");
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mi = String(local.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00+02:00`;
}

async function main(): Promise<void> {
  console.log(`→ reading data/cruises.json + data/zones.json`);
  const cruisesRaw = await readFile(
    resolve(REPO_ROOT, "data", "cruises.json"),
    "utf8",
  );
  const zonesRaw = await readFile(
    resolve(REPO_ROOT, "data", "zones.json"),
    "utf8",
  );

  const cruises = CruisesFileSchema.parse(JSON.parse(cruisesRaw));
  const zones = ZonesFileSchema.parse(JSON.parse(zonesRaw));

  const zoneAreaM2 = new Map<string, number>(
    zones.zones.map((z) => [z.id, polygonAreaM2(z.polygon)] as const),
  );

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const horizonEnd = new Date(
    today.getTime() + HORIZON_DAYS * 24 * 3600 * 1000,
  );

  const todayStr = today.toISOString().slice(0, 10);
  const horizonStr = horizonEnd.toISOString().slice(0, 10);

  const shipsInHorizon = cruises.ships.filter(
    (s) => s.date >= todayStr && s.date <= horizonStr,
  );
  console.log(
    `  ${shipsInHorizon.length} ships in horizon ${todayStr} → ${horizonStr}`,
  );

  const resolved = shipsInHorizon.map(resolveShipWindow);

  console.log(`→ fetching weather from open-meteo.com`);
  const weather = await fetchWeather(todayStr, horizonStr);
  console.log(`  ${weather.size} hourly weather rows`);

  console.log(
    `→ computing zone loads at ${SLOT_MINUTES}-min slots for ${HORIZON_DAYS} days`,
  );

  const slots: ForecastTimeSlot[] = [];
  const slotCount = (HORIZON_DAYS * 24 * 60) / SLOT_MINUTES;
  for (let i = 0; i < slotCount; i++) {
    const slot = new Date(today.getTime() + i * SLOT_MINUTES * 60 * 1000);
    const slotWeather = weather.get(nearestHourKey(slot)) ?? null;
    const allocation = allocateLoad(slot, resolved, zones.zones, slotWeather);

    const zoneRecord: ForecastTimeSlot["zones"] = {};
    for (const [zoneId, { load, contributingShips }] of allocation.loads) {
      const rLoad = Math.round(load);
      const area = zoneAreaM2.get(zoneId) ?? 0;
      const densityPph =
        area > 0 ? rLoad / (area / 10_000) : undefined;
      zoneRecord[zoneId] = {
        load: rLoad,
        share: +(allocation.shares.get(zoneId) ?? 0).toFixed(4),
        level: levelFromDensity(rLoad, area),
        ...(rLoad > 0 && densityPph !== undefined
          ? { density_pph: Math.round(densityPph * 10) / 10 }
          : {}),
        contributing_ships: contributingShips,
      };
    }

    slots.push({
      datetime: formatSlotIso(slot),
      weather: slotWeather,
      weather_bucket: weatherBucket(slotWeather),
      ashore_count: Math.round(allocation.ashoreCount),
      ships_in_port: allocation.shipsInPort,
      zones: zoneRecord,
    });
  }

  const payload: ForecastFile = {
    $schema_version: 1,
    generated_at: new Date().toISOString(),
    based_on: {
      cruises_generated_at: cruises.generated_at,
      zones_version: zones.$schema_version,
    },
    time_slots: slots,
  };

  console.log(`→ validating against schema`);
  ForecastFileSchema.parse(payload);

  await writeDataFile("forecast.json", payload);
  const out = paths("forecast.json");
  console.log(`✓ wrote ${out.primary}`);
  console.log(`✓ wrote ${out.mirror}`);

  let maxLoad = 0;
  let maxSlot: ForecastTimeSlot | null = null;
  let maxZone = "";
  for (const slot of slots) {
    for (const [zoneId, z] of Object.entries(slot.zones)) {
      if (z.load > maxLoad) {
        maxLoad = z.load;
        maxSlot = slot;
        maxZone = zoneId;
      }
    }
  }

  console.log(`\nSummary:`);
  console.log(`  slots:              ${slots.length}`);
  console.log(`  ships in horizon:   ${shipsInHorizon.length}`);
  if (maxSlot) {
    console.log(
      `  peak load:          ${Math.round(maxLoad).toLocaleString()} @ ${maxZone} ${maxSlot.datetime}`,
    );
  }
}

main().catch((err) => {
  console.error("✗ forecast failed:", err);
  process.exit(1);
});

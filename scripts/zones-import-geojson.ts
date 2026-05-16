import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  ZonesFileSchema,
  ZoneTypeSchema,
  AccessModeSchema,
  type ZonesFile,
  type Zone,
  type ZoneType,
  type AccessMode,
} from "./lib/types.js";
import { BASE_SHARE } from "./lib/heuristic.js";
import { REPO_ROOT } from "./lib/write.js";

/**
 * Reads `data/zones.geojson` (drop-in from geojson.io or hand-authored) and
 * regenerates `data/zones.json` from it.
 *
 * The GeoJSON is the source of truth: any zone not present in the geojson is
 * removed from zones.json. This is intentional — when the team re-thinks the
 * zone set (e.g. 9 zones → 5 zones), editing the geojson and re-importing is
 * the canonical workflow.
 *
 * Polygon → role resolution (by `properties.id`):
 *   - "cruiser_dock"  → distance origin (centroid only); NOT a tracked zone
 *   - any other id    → a destination zone; recognised legacy aliases below
 *
 * Each destination polygon needs:
 *   - properties.id   (required; mapped through LEGACY_ID_ALIASES)
 *   - properties.type (optional; falls back to DEFAULT_TYPE_FOR_ID, then errors)
 *   - properties.name_hr / name_en (optional; default to id)
 *
 * Computed automatically:
 *   - center                          = centroid of polygon
 *   - distance_from_cruise_dock_m     = haversine(center, cruiser_dock centroid)
 *     (informational only — the allocation algorithm does NOT use distance;
 *      kept for FE display and pitch anchoring)
 */

interface GeoFeature {
  type: "Feature";
  geometry:
    | { type: "Polygon"; coordinates: Array<Array<[number, number]>> }
    | { type: "Point"; coordinates: [number, number] };
  properties: Record<string, unknown> | null;
}

interface GeoFC {
  type: "FeatureCollection";
  features: GeoFeature[];
}

const DOCK_POLYGON_IDS = new Set(["cruiser_dock", "pristaniste_kruzera"]);
const DOCK_POINT_ID = "cruise_dock";

/**
 * Legacy polygon ids that should be migrated to canonical zone ids on import.
 * Keeps round-tripping working if someone pulls an older geojson from email
 * or git history.
 */
const LEGACY_ID_ALIASES: Record<string, string> = {
  ferry_port: "port",
  bacvice_beach: "beaches",
  mall_of_split: "malls",
};

/**
 * Default `ZoneType` for each canonical zone id. Used when a polygon doesn't
 * carry an explicit `properties.type`. New canonical zones added here must
 * also have an entry in `BASE_SHARE` (lib/heuristic.ts).
 */
const DEFAULT_TYPE_FOR_ID: Record<string, ZoneType> = {
  port: "transport_hub",
  old_town: "historic_center",
  west_coast: "tourist_promenade",
  beaches: "beach",
  malls: "indoor_shopping",
};

/**
 * Default `AccessMode` for each canonical zone id. Used when a polygon doesn't
 * carry an explicit `properties.access_mode`. Walking is the default for
 * walkable zones (<1.5 km from the dock); vehicular for distant ones.
 */
const DEFAULT_ACCESS_MODE_FOR_ID: Record<string, AccessMode> = {
  port: "walking",
  old_town: "walking",
  west_coast: "walking",
  beaches: "walking",
  malls: "vehicular",
};

const DEFAULT_NAME_HR: Record<string, string> = {
  port: "Trajektna luka i lučko područje",
  old_town: "Stari grad",
  west_coast: "Zapadna obala",
  beaches: "Bačvice i Ovčice",
  malls: "Mall of Split",
};
const DEFAULT_NAME_EN: Record<string, string> = {
  port: "Port & Ferry Terminal",
  old_town: "Old Town",
  west_coast: "West Coast",
  beaches: "Bačvice & Ovčice Beaches",
  malls: "Mall of Split",
};

function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function centroidOfRing(
  ring: Array<[number, number]>,
): { lat: number; lng: number } {
  const uniq =
    ring.length >= 2 &&
    ring[0]![0] === ring[ring.length - 1]![0] &&
    ring[0]![1] === ring[ring.length - 1]![1]
      ? ring.slice(0, -1)
      : ring;
  if (uniq.length === 0) throw new Error("empty polygon ring");
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of uniq) {
    sumLng += lng;
    sumLat += lat;
  }
  return {
    lat: +(sumLat / uniq.length).toFixed(6),
    lng: +(sumLng / uniq.length).toFixed(6),
  };
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function isDegenerate(ring: Array<[number, number]>): boolean {
  if (ring.length < 4) return true;
  const first = ring[0]!;
  return ring.every(
    (p) => p[0] === first[0] && p[1] === first[1],
  );
}

async function main(): Promise<void> {
  const zonesPath = resolve(REPO_ROOT, "data", "zones.json");
  const geoPath = resolve(REPO_ROOT, "data", "zones.geojson");

  const geoRaw = await readFile(geoPath, "utf8");
  const fc = JSON.parse(geoRaw) as GeoFC;
  if (fc.type !== "FeatureCollection") {
    throw new Error("zones.geojson is not a FeatureCollection");
  }

  // --- Resolve cruise dock origin ---------------------------------------
  let dock: { lat: number; lng: number } | null = null;
  let dockSource = "none";

  const dockPolygon = fc.features.find(
    (f) =>
      f.geometry.type === "Polygon" &&
      typeof f.properties?.id === "string" &&
      DOCK_POLYGON_IDS.has(f.properties.id as string),
  );
  const dockPoint = fc.features.find(
    (f) => f.geometry.type === "Point" && f.properties?.id === DOCK_POINT_ID,
  );

  if (dockPolygon && dockPolygon.geometry.type === "Polygon") {
    const ring = dockPolygon.geometry.coordinates[0];
    if (ring && !isDegenerate(ring)) {
      dock = centroidOfRing(ring);
      dockSource = `centroid of polygon id="${dockPolygon.properties?.id}"`;
    }
  } else if (dockPoint && dockPoint.geometry.type === "Point") {
    const [lng, lat] = dockPoint.geometry.coordinates;
    dock = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
    dockSource = `point id="${DOCK_POINT_ID}"`;
  }

  if (!dock) {
    throw new Error(
      "zones.geojson has no recognisable cruise dock feature " +
        `(expected Polygon with id in {${[...DOCK_POLYGON_IDS].join(", ")}} ` +
        `or Point with id="${DOCK_POINT_ID}").`,
    );
  }
  console.log(`✓ cruise_dock → ${dock.lat}, ${dock.lng}  (${dockSource})`);

  // --- Resolve destination zones ----------------------------------------
  const zones: Zone[] = [];
  const errors: string[] = [];

  for (const feat of fc.features) {
    if (feat.geometry.type !== "Polygon") continue;
    const rawId = asString(feat.properties?.id);
    if (!rawId) {
      console.warn(`  ⚠ polygon without properties.id — skipped`);
      continue;
    }
    if (DOCK_POLYGON_IDS.has(rawId)) continue;

    const ring = feat.geometry.coordinates[0];
    if (!ring || isDegenerate(ring)) {
      console.warn(`  ⚠ feature id="${rawId}" has degenerate polygon — skipped`);
      continue;
    }

    const id = LEGACY_ID_ALIASES[rawId] ?? rawId;
    const center = centroidOfRing(ring);
    const distance = +haversineM(dock, center).toFixed(1);

    const propType = asString(feat.properties?.type);
    let zoneType: ZoneType;
    if (propType) {
      const parsed = ZoneTypeSchema.safeParse(propType);
      if (!parsed.success) {
        errors.push(
          `zone "${id}": invalid type "${propType}". Must be one of [${ZoneTypeSchema.options.join(", ")}].`,
        );
        continue;
      }
      zoneType = parsed.data;
    } else if (DEFAULT_TYPE_FOR_ID[id]) {
      zoneType = DEFAULT_TYPE_FOR_ID[id]!;
    } else {
      errors.push(
        `zone "${id}": no properties.type and no default registered. ` +
          `Add properties.type to the geojson (one of ${ZoneTypeSchema.options.join(", ")}) ` +
          `or register a default in zones-import-geojson.ts.`,
      );
      continue;
    }

    const propAccess = asString(feat.properties?.access_mode);
    let accessMode: AccessMode;
    if (propAccess) {
      const parsed = AccessModeSchema.safeParse(propAccess);
      if (!parsed.success) {
        errors.push(
          `zone "${id}": invalid access_mode "${propAccess}". Must be one of [${AccessModeSchema.options.join(", ")}].`,
        );
        continue;
      }
      accessMode = parsed.data;
    } else if (DEFAULT_ACCESS_MODE_FOR_ID[id]) {
      accessMode = DEFAULT_ACCESS_MODE_FOR_ID[id]!;
    } else {
      // Reasonable fallback: anything beyond a 1.5 km walk is vehicular.
      accessMode = distance > 1500 ? "vehicular" : "walking";
    }

    if (BASE_SHARE[id] === undefined) {
      errors.push(
        `zone "${id}": no entry in BASE_SHARE (lib/heuristic.ts). ` +
          `Add a base_share for it (and re-balance other shares so the total is 1.0) ` +
          `or rename the polygon to an existing canonical id ` +
          `(${Object.keys(BASE_SHARE).join(", ")}).`,
      );
      continue;
    }

    const name_hr =
      asString(feat.properties?.name_hr) ?? DEFAULT_NAME_HR[id] ?? id;
    const name_en =
      asString(feat.properties?.name_en) ?? DEFAULT_NAME_EN[id] ?? id;

    zones.push({
      id,
      name_hr,
      name_en,
      center,
      polygon: ring,
      distance_from_cruise_dock_m: distance,
      type: zoneType,
      access_mode: accessMode,
    });

    const tag = rawId !== id ? ` (was "${rawId}")` : "";
    console.log(
      `✓ ${id.padEnd(12)} type=${zoneType.padEnd(18)} access=${accessMode.padEnd(10)} dock=${distance}m${tag}`,
    );
  }

  if (errors.length > 0) {
    console.error(`\n✗ import failed with ${errors.length} error(s):`);
    for (const e of errors) console.error(`    - ${e}`);
    process.exit(2);
  }

  if (zones.length === 0) {
    throw new Error("zones.geojson produced 0 destination zones");
  }

  // Sanity check: warn (don't fail) if BASE_SHARE values don't sum to ~1
  const shareSum = zones.reduce((s, z) => s + (BASE_SHARE[z.id] ?? 0), 0);
  if (Math.abs(shareSum - 1.0) > 0.01) {
    console.warn(
      `\n  ⚠ BASE_SHARE for these ${zones.length} zones sums to ${shareSum.toFixed(3)} ` +
        `(expected 1.0). The allocation model will still renormalise, but the ` +
        `per-zone interpretation drifts from the documented values.`,
    );
  }

  const out: ZonesFile = {
    $schema_version: 1,
    cruise_dock: dock,
    zones,
  };
  ZonesFileSchema.parse(out);

  await writeFile(zonesPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(``);
  console.log(`✓ wrote ${zonesPath}`);
  console.log(`  ${zones.length} destination zone(s), 1 dock origin`);
  console.log(``);
  console.log(`Run \`npm run sync && npm run forecast\` to propagate.`);
}

main().catch((err) => {
  console.error("✗ import failed:", err);
  process.exit(1);
});

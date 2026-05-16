import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ZonesFileSchema } from "./lib/types.js";
import { REPO_ROOT } from "./lib/write.js";

/**
 * Exports `data/zones.json` to `data/zones.geojson` as a FeatureCollection
 * importable into https://geojson.io for visual editing.
 *
 * The cruise dock is exported as a Point Feature with id="cruise_dock"
 * because zones.json stores only the dock centroid, not its polygon. If the
 * dock polygon exists in the original geojson, it is preserved by the import
 * step (zones-import-geojson.ts accepts a Polygon with id "cruiser_dock" as
 * an equally valid dock specification — its centroid wins).
 *
 * Round-trip rule: any zone you add in geojson.io needs `properties.id` to
 * match a canonical zone (`port`, `old_town`, `west_coast`, `beaches`,
 * `malls`) OR a legacy alias the import knows about. New canonical zones
 * also need a BASE_SHARE entry in `scripts/lib/heuristic.ts` before they
 * become valid.
 */

interface GeoJsonFeature {
  type: "Feature";
  geometry:
    | { type: "Polygon"; coordinates: Array<Array<[number, number]>> }
    | { type: "Point"; coordinates: [number, number] };
  properties: Record<string, unknown>;
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

async function main(): Promise<void> {
  const zonesPath = resolve(REPO_ROOT, "data", "zones.json");
  const raw = await readFile(zonesPath, "utf8");
  const zones = ZonesFileSchema.parse(JSON.parse(raw));

  const features: GeoJsonFeature[] = [];

  features.push({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [zones.cruise_dock.lng, zones.cruise_dock.lat],
    },
    properties: {
      id: "cruise_dock",
      label: "Cruise dock origin (drag to relocate)",
      role: "origin",
      note: "Distance origin only. Not a destination zone.",
    },
  });

  for (const z of zones.zones) {
    features.push({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [z.polygon as Array<[number, number]>],
      },
      properties: {
        id: z.id,
        name_hr: z.name_hr,
        name_en: z.name_en,
        type: z.type,
        distance_from_cruise_dock_m: z.distance_from_cruise_dock_m,
        center_lat: z.center.lat,
        center_lng: z.center.lng,
      },
    });
  }

  const fc: GeoJsonFeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  const outPath = resolve(REPO_ROOT, "data", "zones.geojson");
  await writeFile(outPath, JSON.stringify(fc, null, 2) + "\n", "utf8");

  console.log(`✓ wrote ${outPath}`);
  console.log(
    `  ${features.length} features (1 dock point + ${features.length - 1} zone polygons)`,
  );
  console.log(``);
  console.log(`Next steps:`);
  console.log(`  1. Open https://geojson.io`);
  console.log(`  2. Open → File → Open → select data/zones.geojson`);
  console.log(`  3. Edit polygons; drag the cruise_dock point if needed`);
  console.log(`  4. Save → Save as GeoJSON → overwrite data/zones.geojson`);
  console.log(`  5. Run:  npm run zones:import`);
  console.log(`  6. Run:  npm run forecast`);
}

main().catch((err) => {
  console.error("✗ export failed:", err);
  process.exit(1);
});

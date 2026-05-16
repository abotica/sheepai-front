import { z } from "zod";

/**
 * Canonical type + runtime schema definitions for the Brod Alarm data contract.
 * Any change here must be reflected in `Brod Alarm.md` Section 9 and `data/README.md`.
 *
 * Schema versions are integers. Bump when the shape changes in a breaking way.
 */

// ---------------------------------------------------------------------------
// Cruise schedule
// ---------------------------------------------------------------------------

export const CruiseShipSchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  ship_name: z.string().min(1),
  cruise_line: z.string().min(1),
  arrival_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  departure_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  passengers: z.number().int().nonnegative(),
});

export const CruisesFileSchema = z.object({
  $schema_version: z.literal(1),
  generated_at: z.string(),
  source: z.string(),
  year: z.number().int(),
  ships: z.array(CruiseShipSchema),
});

export type CruiseShip = z.infer<typeof CruiseShipSchema>;
export type CruisesFile = z.infer<typeof CruisesFileSchema>;

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

/**
 * Zone types drive the weather-modifier lookup in `lib/heuristic.ts`. Each type
 * describes the *behavioural* response of cruise passengers in that kind of
 * place (sheltered vs outdoor; recreational vs commercial). Adding a new zone
 * means picking one of these types — never invent per-zone weather rules.
 */
export const ZoneTypeSchema = z.enum([
  "transport_hub",
  "historic_center",
  "indoor_shopping",
  "tourist_promenade",
  "local_refuge",
  "beach",
]);

/**
 * Access mode controls how the FE animates passengers reaching a zone:
 *  - "walking"   : dots traverse from cruise_dock at ~80 m/min along the
 *                  most-likely walking path. Used for zones within 1.5 km.
 *  - "vehicular" : dots arrive via bus/taxi/Uber. FE should either teleport
 *                  with a delay or animate at ~500 m/min (≈30 km/h city
 *                  traffic). Used for distant destinations where walking is
 *                  not realistic (e.g. Mall of Split, 4 km from dock).
 *
 * Access mode does NOT affect the allocation model; it's a hint for the
 * passenger-flow animation in the FE.
 */
export const AccessModeSchema = z.enum(["walking", "vehicular"]);

export const ZoneSchema = z.object({
  id: z.string(),
  name_hr: z.string(),
  name_en: z.string(),
  center: z.object({ lat: z.number(), lng: z.number() }),
  polygon: z.array(z.tuple([z.number(), z.number()])),
  distance_from_cruise_dock_m: z.number().nonnegative(),
  type: ZoneTypeSchema,
  access_mode: AccessModeSchema,
});

export const ZonesFileSchema = z.object({
  $schema_version: z.literal(1),
  cruise_dock: z.object({ lat: z.number(), lng: z.number() }),
  zones: z.array(ZoneSchema),
});

export type Zone = z.infer<typeof ZoneSchema>;
export type ZoneType = z.infer<typeof ZoneTypeSchema>;
export type AccessMode = z.infer<typeof AccessModeSchema>;
export type ZonesFile = z.infer<typeof ZonesFileSchema>;

// ---------------------------------------------------------------------------
// Forecast
// ---------------------------------------------------------------------------

export const LoadLevelSchema = z.enum(["green", "yellow", "orange", "red"]);

export const ZoneLoadSchema = z.object({
  load: z.number().nonnegative(),
  share: z.number().min(0).max(1),
  level: LoadLevelSchema,
  /** Passengers per hectare (zone polygon area) — same basis as `level`. */
  density_pph: z.number().nonnegative().optional(),
  contributing_ships: z.array(z.string()),
});

export const WeatherSchema = z.object({
  temp_c: z.number(),
  wind_kmh: z.number(),
  precip_mm: z.number(),
});

export const WeatherBucketSchema = z.enum([
  "rain",
  "hot_sunny",
  "strong_wind",
  "cool_cloudy",
  "default",
]);

export const ForecastTimeSlotSchema = z.object({
  datetime: z.string(),
  weather: WeatherSchema.nullable(),
  weather_bucket: WeatherBucketSchema,
  ashore_count: z.number().nonnegative(),
  ships_in_port: z.array(z.string()),
  zones: z.record(z.string(), ZoneLoadSchema),
});

export const ForecastFileSchema = z.object({
  $schema_version: z.literal(1),
  generated_at: z.string(),
  based_on: z.object({
    cruises_generated_at: z.string(),
    zones_version: z.number(),
  }),
  time_slots: z.array(ForecastTimeSlotSchema),
});

export type LoadLevel = z.infer<typeof LoadLevelSchema>;
export type ZoneLoad = z.infer<typeof ZoneLoadSchema>;
export type Weather = z.infer<typeof WeatherSchema>;
export type WeatherBucket = z.infer<typeof WeatherBucketSchema>;
export type ForecastTimeSlot = z.infer<typeof ForecastTimeSlotSchema>;
export type ForecastFile = z.infer<typeof ForecastFileSchema>;

// ---------------------------------------------------------------------------
// Recommendations (copy bank)
// ---------------------------------------------------------------------------

export const LocalizedStringSchema = z.object({
  hr: z.string(),
  en: z.string(),
});

export const RecommendationsFileSchema = z.object({
  $schema_version: z.literal(1),
  business: z.record(z.string(), LocalizedStringSchema),
  local: z.record(z.string(), LocalizedStringSchema),
});

export type LocalizedString = z.infer<typeof LocalizedStringSchema>;
export type RecommendationsFile = z.infer<typeof RecommendationsFileSchema>;

/**
 * Data contract types + helpers for the Brod Alarm map view.
 *
 * Mirrors `scripts/lib/types.ts` (the data-pipeline schema). Kept here as a
 * narrow client-side copy so the frontend has no runtime dependency on the
 * pipeline package. If schema drifts, sync both files (see `data/README.md`).
 */

export type LoadLevel = "green" | "yellow" | "orange" | "red";

export type WeatherBucket =
  | "rain"
  | "hot_sunny"
  | "strong_wind"
  | "cool_cloudy"
  | "default";

export type ZoneType =
  | "transport_hub"
  | "historic_center"
  | "indoor_shopping"
  | "tourist_promenade"
  | "local_refuge"
  | "beach";

export type AccessMode = "walking" | "vehicular";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Zone {
  id: string;
  name_hr: string;
  name_en: string;
  center: LatLng;
  polygon: Array<[number, number]>; // GeoJSON [lng, lat] closed ring
  distance_from_cruise_dock_m: number;
  type: ZoneType;
  access_mode: AccessMode;
}

export interface ZonesFile {
  $schema_version: 1;
  cruise_dock: LatLng;
  zones: Zone[];
}

export interface Weather {
  temp_c: number;
  wind_kmh: number;
  precip_mm: number;
}

export interface ZoneLoad {
  load: number;
  share: number;
  level: LoadLevel;
  /** Passengers per hectare (matches pipeline `density_pph`). */
  density_pph?: number;
  contributing_ships: string[];
}

export interface ForecastSlot {
  datetime: string;
  weather: Weather | null;
  weather_bucket: WeatherBucket;
  ashore_count: number;
  ships_in_port: string[];
  zones: Record<string, ZoneLoad>;
}

export interface ForecastFile {
  $schema_version: 1;
  generated_at: string;
  based_on: {
    cruises_generated_at: string;
    zones_version: number;
  };
  time_slots: ForecastSlot[];
}

/** Cruise schedule entry, lifted to the FE for ship-name lookups in popups. */
export interface CruiseShip {
  id: string;
  date: string;
  ship_name: string;
  cruise_line: string;
  arrival_time: string | null;
  departure_time: string | null;
  passengers: number;
}

export interface CruisesFile {
  $schema_version: 1;
  generated_at: string;
  source: string;
  year: number;
  ships: CruiseShip[];
}

// ---------------------------------------------------------------------------
// Fetch helpers — all read from `/data/*.json` served by Next from `public/`
// ---------------------------------------------------------------------------

export async function fetchForecast(): Promise<ForecastFile> {
  const res = await fetch("/data/forecast.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`forecast.json fetch failed: ${res.status}`);
  return (await res.json()) as ForecastFile;
}

export async function fetchZones(): Promise<ZonesFile> {
  const res = await fetch("/data/zones.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`zones.json fetch failed: ${res.status}`);
  return (await res.json()) as ZonesFile;
}

export async function fetchCruises(): Promise<CruisesFile> {
  const res = await fetch("/data/cruises.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`cruises.json fetch failed: ${res.status}`);
  return (await res.json()) as CruisesFile;
}

// ---------------------------------------------------------------------------
// Level → color tokens (mirror of `frontend/CLAUDE.md` intensity palette)
// ---------------------------------------------------------------------------

export interface IntensityColor {
  stroke: string;
  fill: string;
  fillOpacity: number;
  label: string;
}

export const LEVEL_COLORS: Record<LoadLevel, IntensityColor> = {
  green: {
    stroke: "#16A34A",
    fill: "#16A34A",
    fillOpacity: 0.16,
    label: "Mirno",
  },
  yellow: {
    stroke: "#D88A0E",
    fill: "#D88A0E",
    fillOpacity: 0.24,
    label: "Gužva raste",
  },
  orange: {
    stroke: "#C25A18",
    fill: "#C25A18",
    fillOpacity: 0.30,
    label: "Velika gužva",
  },
  red: {
    stroke: "#B83A2C",
    fill: "#B83A2C",
    fillOpacity: 0.40,
    label: "Tsunami",
  },
};

export function levelColor(level: LoadLevel): IntensityColor {
  return LEVEL_COLORS[level];
}

// ---------------------------------------------------------------------------
// Slot index helpers
// ---------------------------------------------------------------------------

/**
 * Finds the slot index closest to `now` (or `target`), clamping to [0, n-1].
 * Returns 0 if the forecast hasn't been generated yet or only has a single slot.
 */
export function findClosestSlotIndex(
  forecast: ForecastFile,
  target: Date = new Date(),
): number {
  if (forecast.time_slots.length === 0) return 0;
  const targetMs = target.getTime();
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < forecast.time_slots.length; i++) {
    const slotMs = new Date(forecast.time_slots[i]!.datetime).getTime();
    const dist = Math.abs(slotMs - targetMs);
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    } else if (slotMs > targetMs) {
      // slots are monotonic; once we start drifting away there's no point
      break;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Cruise event → timeline marker
// ---------------------------------------------------------------------------

export type ShipEventType = "arrival" | "departure";

export interface ShipEvent {
  slotIndex: number;
  type: ShipEventType;
  ship: CruiseShip;
  /** Combined `date` + time used for this marker (scheduled or default). */
  datetime: string;
  /** True when time came from defaults (missing in source schedule). */
  timeInferred: boolean;
}

/**
 * Croatia stays in CEST (`+02:00`) for the whole forecast horizon
 * (late March → late October). Hardcoding the offset matches the offset baked
 * into every `forecast.json` slot. If we ever stretch the horizon across a DST
 * switch, derive this from the first slot's ISO offset instead.
 */
const SPLIT_TZ_OFFSET = "+02:00";

/** Same defaults as `scripts/lib/heuristic.ts` when scrape has no numeric time. */
export const SCHEDULE_DEFAULT_ARRIVAL = "08:00";
export const SCHEDULE_DEFAULT_DEPARTURE = "17:00";

function combineDateAndTime(date: string, hhmm: string): string {
  return `${date}T${hhmm}:00${SPLIT_TZ_OFFSET}`;
}

/**
 * One marker per arrival and per departure. Missing scrape times use the same
 * defaults as the forecast pipeline (`DEFAULT_ARRIVAL` / `DEFAULT_DEPARTURE`).
 */
export function buildShipEvents(
  forecast: ForecastFile,
  cruises: CruisesFile,
): ShipEvent[] {
  if (forecast.time_slots.length === 0) return [];
  const horizonStartMs = new Date(forecast.time_slots[0]!.datetime).getTime();
  const horizonEndMs = new Date(
    forecast.time_slots[forecast.time_slots.length - 1]!.datetime,
  ).getTime();

  const out: ShipEvent[] = [];
  for (const ship of cruises.ships) {
    const pairs: Array<{
      hhmm: string;
      type: ShipEventType;
      inferred: boolean;
    }> = [
      {
        hhmm: ship.arrival_time ?? SCHEDULE_DEFAULT_ARRIVAL,
        type: "arrival",
        inferred: ship.arrival_time == null,
      },
      {
        hhmm: ship.departure_time ?? SCHEDULE_DEFAULT_DEPARTURE,
        type: "departure",
        inferred: ship.departure_time == null,
      },
    ];

    for (const { hhmm, type, inferred } of pairs) {
      const iso = combineDateAndTime(ship.date, hhmm);
      const ms = new Date(iso).getTime();
      if (Number.isNaN(ms)) continue;
      if (ms < horizonStartMs || ms > horizonEndMs) continue;
      out.push({
        slotIndex: findClosestSlotIndex(forecast, new Date(iso)),
        type,
        ship,
        datetime: iso,
        timeInferred: inferred,
      });
    }
  }
  return out.sort((a, b) => a.slotIndex - b.slotIndex);
}

/**
 * Defaults to the next slot in the day that has at least one ship in port.
 * Falls back to the closest-to-now slot if no busy slot exists in the horizon.
 * @param maxSlotIndex — when set (e.g. shortened mobile timeline), only consider
 *                       slots `0..maxSlotIndex` and clamp the result.
 */
export function findDefaultDisplaySlot(
  forecast: ForecastFile,
  maxSlotIndex?: number,
): number {
  const cap =
    maxSlotIndex !== undefined
      ? Math.min(maxSlotIndex, forecast.time_slots.length - 1)
      : forecast.time_slots.length - 1;
  if (cap < 0) return 0;

  const now = Date.now();
  let firstUpcomingBusy = -1;
  for (let i = 0; i <= cap; i++) {
    const slot = forecast.time_slots[i]!;
    const slotMs = new Date(slot.datetime).getTime();
    if (slotMs < now) continue;
    if (slot.ashore_count > 0) {
      firstUpcomingBusy = i;
      break;
    }
  }
  if (firstUpcomingBusy !== -1) return firstUpcomingBusy;
  return Math.min(findClosestSlotIndex(forecast), cap);
}

// ---------------------------------------------------------------------------
// Croatian-friendly date / time formatters
// ---------------------------------------------------------------------------

const DAY_SHORT_HR = ["NED", "PON", "UTO", "SRI", "ČET", "PET", "SUB"] as const;
const MONTH_LONG_HR = [
  "siječnja",
  "veljače",
  "ožujka",
  "travnja",
  "svibnja",
  "lipnja",
  "srpnja",
  "kolovoza",
  "rujna",
  "listopada",
  "studenoga",
  "prosinca",
] as const;

/**
 * Formats an ISO slot datetime into the Brod Alarm display style.
 * Example: "PET · 16. svibnja · 10:30"
 */
export function formatSlotLabel(iso: string): string {
  const d = new Date(iso);
  const dayShort = DAY_SHORT_HR[d.getDay()] ?? "—";
  const month = MONTH_LONG_HR[d.getMonth()] ?? "—";
  const dom = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dayShort} · ${dom}. ${month} · ${hh}:${mm}`;
}

/** "10:30" */
export function formatSlotTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Whether two ISO slots fall on the same calendar day in local time. */
export function sameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

// ---------------------------------------------------------------------------
// Weather bucket → human-readable Croatian label + icon hint
// ---------------------------------------------------------------------------

export interface WeatherDescriptor {
  label: string;
  /** Single-character or short string visual fallback (no icon library lock-in). */
  hint: string;
}

export const WEATHER_BUCKET_LABELS: Record<WeatherBucket, WeatherDescriptor> = {
  rain: { label: "Kiša", hint: "☂" },
  hot_sunny: { label: "Vruće i sunčano", hint: "☀" },
  strong_wind: { label: "Jak vjetar", hint: "≈" },
  cool_cloudy: { label: "Svježe, oblačno", hint: "☁" },
  default: { label: "Mirno", hint: "·" },
};

export function weatherDescriptor(bucket: WeatherBucket): WeatherDescriptor {
  return WEATHER_BUCKET_LABELS[bucket];
}

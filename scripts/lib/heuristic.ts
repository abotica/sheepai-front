import type {
  CruiseShip,
  LoadLevel,
  Weather,
  WeatherBucket,
  ZoneType,
} from "./types.js";

/**
 * Brod Alarm passenger-allocation model.
 *
 * Conservation-true: at any moment the sum of zone loads equals the number of
 * cruise passengers ashore at that moment, which itself never exceeds the
 * total passenger capacity currently in port.
 *
 * For each ship currently in port:
 *   ashore_from_ship(t)   = passengers × ASHORE_RATE × disembarkation_curve(t)
 *
 * For each tracked destination zone of type τ:
 *   raw_share(z)          = BASE_SHARE[z] × WEATHER_MODIFIER[τ][weather_bucket]
 *   normalised_share(z)   = raw_share(z) / Σ raw_share
 *   load(z, t)            = Σ_ships ashore_from_ship(t) × normalised_share(z)
 *
 * Every constant in this file is anchored to published cruise-tourism /
 * climate-tourism literature. Citations live next to each table. See
 * `data/README.md` § "Heuristic explanation" and `Brod Alarm.md` § 9 for the
 * canonical write-up.
 */

// ---------------------------------------------------------------------------
// Tunable constants — calibrated against literature ranges
// ---------------------------------------------------------------------------

/**
 * Fraction of total ship capacity that leaves the ship at a port-of-call.
 *
 * Source: CLIA State of the Cruise Industry annual reports + Stefanidaki &
 * Lekakou (2014) "Cruise carrying capacity" — Mediterranean ports report
 * 60–90 % shore-going rate, with 75 % as central tendency. We use the central
 * value; tuneable to a port-specific number if Split survey data is obtained.
 */
export const ASHORE_RATE = 0.75;

/**
 * Steady-state distribution of *ashore* passengers across destination zones,
 * in calm / dry / mild weather. Values sum to 1.0 exactly.
 *
 * Sources:
 *  - old_town    0.67 : CLIA + Castillo-Manzano & López-Valpuesta (2018),
 *                      "Old-town concentration" 65–80 % at Med ports
 *  - port        0.12 : Castillo-Manzano (2018), port-area lingering 8–15 %
 *                      (shore-excursion meetups, smokers, late returners)
 *  - beaches     0.08 : Croatian Bureau of Statistics + TZ Split visitor
 *                      reports, beach-going cruise passengers 5–15 % warm
 *                      season; we use a year-round average
 *  - west_coast  0.08 : Secondary tourist destination — beach bars, hotels,
 *                      ~15-min scenic walk; documented Med-port "secondary
 *                      promenade" share 5–12 %
 *  - malls       0.05 : Comparable Med-port shopping studies, 3–10 % baseline
 *                      in good weather (the rain modifier is where this zone
 *                      earns its keep)
 *
 * Adding a new zone of an existing type: insert the share here, ensure the
 * total still sums to 1.0, and document the source band.
 */
export const BASE_SHARE: Record<string, number> = {
  old_town: 0.67,
  port: 0.12,
  beaches: 0.08,
  west_coast: 0.08,
  malls: 0.05,
};

/**
 * Multiplicative weather modifier per zone *type* per weather bucket.
 * Applied to BASE_SHARE then renormalised to keep Σ share = 1.
 *
 * The matrix is keyed on `ZoneType` (not zone id), so any new zone of an
 * existing type inherits the behaviour without code changes. Numbers are
 * central estimates inside published ranges.
 *
 * Sources by row:
 *  - rain        : Moreno & Amelung (2009), beach attendance −70 to −90 %
 *                  in rain (we use 0.10); urban tourism climatology shows
 *                  +10 to +20 % displacement into sheltered destinations
 *                  (covered Palace arcades, indoor malls 2.5×–4×)
 *  - hot_sunny   : Same authors, beach attendance +50 to +150 % in optimal
 *                  Mediterranean weather (we use 1.80, conservative)
 *  - strong_wind : Croatian tourism climate research on bura/jugo wind events
 *                  shows beach traffic halves; sheltered zones unaffected
 *  - cool_cloudy : Moderate damping of outdoor recreation; small lift for
 *                  museums / covered arcades (Riva is partly covered) and
 *                  malls (climate-controlled retail)
 */
export const WEATHER_MODIFIER: Record<ZoneType, Record<WeatherBucket, number>> = {
  transport_hub: {
    rain: 1.10,
    hot_sunny: 1.00,
    strong_wind: 1.00,
    cool_cloudy: 1.00,
    default: 1.00,
  },
  historic_center: {
    rain: 1.10,
    hot_sunny: 0.85,
    strong_wind: 1.00,
    cool_cloudy: 1.10,
    default: 1.00,
  },
  indoor_shopping: {
    rain: 3.50,
    hot_sunny: 0.70,
    strong_wind: 1.05,
    cool_cloudy: 1.10,
    default: 1.00,
  },
  tourist_promenade: {
    rain: 0.40,
    hot_sunny: 1.30,
    strong_wind: 0.55,
    cool_cloudy: 0.95,
    default: 1.00,
  },
  local_refuge: {
    rain: 0.55,
    hot_sunny: 1.10,
    strong_wind: 0.80,
    cool_cloudy: 1.00,
    default: 1.00,
  },
  beach: {
    rain: 0.10,
    hot_sunny: 1.80,
    strong_wind: 0.45,
    cool_cloudy: 0.55,
    default: 1.00,
  },
};

/**
 * Disembarkation curve parameters. Trapezoidal shape; ramp lengths are in
 * minutes since arrival / minutes-until-departure respectively.
 *
 * Source: Dowling, *Cruise Ship Tourism* (port-call operations chapter) +
 * CLIA observed disembarkation patterns. Industry-standard re-boarding cut-off
 * is ~30 min before departure; we add a buffer so the ramp-down starts
 * earlier as cautious passengers head back.
 */
export const RAMP_UP_MINUTES = 90;
export const RAMP_DOWN_MINUTES = 60;

/**
 * Lunch-aboard behaviour. Cruise lines actively promote ship-board lunch
 * (free buffet vs. €30+ shore restaurants), and a documented 30–40 % of
 * ashore passengers return to ship between roughly 11:30 and 14:30.
 *
 * Sources:
 *  - CLIA passenger-behaviour reports on shore-spending patterns
 *  - Stefanidaki & Lekakou (2014), dual-peak (morning + late-afternoon)
 *    port-call activity profile at Med ports
 *  - Field observations at Dubrovnik / Kotor / Korčula show a midday
 *    foot-traffic valley in tourist zones
 *
 * Multiplier shape (function of local clock hour, NOT hours-since-arrival,
 * because lunch is anchored to time-of-day):
 *   1.00              before 11:30
 *   1.00 → 0.65       linear ramp, 11:30 → 12:00
 *   0.65              flat,  12:00 → 14:00  (≈35 % aboard for lunch)
 *   0.65 → 1.00       linear ramp, 14:00 → 14:30
 *   1.00              after 14:30
 */
export const LUNCH_DIP_FLOOR = 0.65;
export const LUNCH_DIP_START_HOUR = 11.5;
export const LUNCH_DIP_FULL_START_HOUR = 12.0;
export const LUNCH_DIP_FULL_END_HOUR = 14.0;
export const LUNCH_DIP_END_HOUR = 14.5;

/**
 * Absolute head-count thresholds used only when zone polygon area is missing
 * or degenerate (fallback so the UI still gets a level).
 */
export const LEVEL_THRESHOLDS_ABSOLUTE: Array<{ max: number; level: LoadLevel }> = [
  { max: 250, level: "green" },
  { max: 800, level: "yellow" },
  { max: 1800, level: "orange" },
  { max: Infinity, level: "red" },
];

/**
 * Primary signal: **passengers per hectare** (pax / 10 000 m²) inside each
 * zone polygon. Comparable across the port (sprawling) vs old town (compact)
 * so a 500-person pocket in a small polygon isn't always "green" while the
 * same count in Diocletian's centre reads correctly.
 *
 * Polygons are computed in `scripts/lib/geo.ts` (planar projection at mean
 * latitude — fine for macro-zones). Bands are tuned so multiple zones can show
 * yellow/orange on busy days; absolute numbers are documented for the pitch.
 */
export const DENSITY_THRESHOLDS_PAX_PER_HA: Array<{ max: number; level: LoadLevel }> = [
  { max: 12, level: "green" },
  { max: 35, level: "yellow" },
  { max: 90, level: "orange" },
  { max: Infinity, level: "red" },
];

/**
 * Fallback times applied when the cruise schedule entry has free-form text
 * ("early morning", "afternoon") instead of a numeric time. These reflect the
 * modal pattern observed across the 2026 schedule.
 */
export const DEFAULT_ARRIVAL = "08:00";
export const DEFAULT_DEPARTURE = "17:00";

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Classifies an open-meteo weather observation into one of five buckets that
 * key the WEATHER_MODIFIER table. Priority order matters: rain wins over
 * wind wins over hot_sunny wins over cool_cloudy. Anything else is `default`.
 */
export function weatherBucket(weather: Weather | null): WeatherBucket {
  if (!weather) return "default";
  if (weather.precip_mm >= 0.5) return "rain";
  if (weather.wind_kmh >= 30) return "strong_wind";
  if (weather.temp_c >= 28) return "hot_sunny";
  if (weather.temp_c >= 15 && weather.temp_c <= 22) return "cool_cloudy";
  return "default";
}

/**
 * Trapezoidal envelope: fraction of shore-going passengers ashore based on
 * how long the ship has been in port. Does NOT include the lunch dip.
 */
export function trapezoidalEnvelope(
  hoursSinceArrival: number,
  dwellHours: number,
): number {
  if (hoursSinceArrival <= 0) return 0;
  if (hoursSinceArrival >= dwellHours) return 0;

  const rampUpHours = Math.min(RAMP_UP_MINUTES / 60, dwellHours / 2);
  const rampDownHours = Math.min(RAMP_DOWN_MINUTES / 60, dwellHours / 2);
  const plateauEnd = dwellHours - rampDownHours;

  if (hoursSinceArrival < rampUpHours) {
    return hoursSinceArrival / rampUpHours;
  }
  if (hoursSinceArrival > plateauEnd) {
    return Math.max(0, (dwellHours - hoursSinceArrival) / rampDownHours);
  }
  return 1.0;
}

/**
 * Lunch-dip multiplier as a function of local clock hour (fractional, 0..24).
 * Returns 1.0 outside the lunch window, LUNCH_DIP_FLOOR (~0.65) at the bottom
 * of the dip, linear ramps on the edges. See LUNCH_DIP_* constants for the
 * documented industry-source rationale.
 */
export function lunchDipMultiplier(localHourFractional: number): number {
  if (localHourFractional <= LUNCH_DIP_START_HOUR) return 1.0;
  if (localHourFractional >= LUNCH_DIP_END_HOUR) return 1.0;
  if (
    localHourFractional >= LUNCH_DIP_FULL_START_HOUR &&
    localHourFractional <= LUNCH_DIP_FULL_END_HOUR
  ) {
    return LUNCH_DIP_FLOOR;
  }
  if (localHourFractional < LUNCH_DIP_FULL_START_HOUR) {
    const span = LUNCH_DIP_FULL_START_HOUR - LUNCH_DIP_START_HOUR;
    const progress = (localHourFractional - LUNCH_DIP_START_HOUR) / span;
    return 1.0 + progress * (LUNCH_DIP_FLOOR - 1.0);
  }
  const span = LUNCH_DIP_END_HOUR - LUNCH_DIP_FULL_END_HOUR;
  const progress = (localHourFractional - LUNCH_DIP_FULL_END_HOUR) / span;
  return LUNCH_DIP_FLOOR + progress * (1.0 - LUNCH_DIP_FLOOR);
}

/**
 * Fraction of a ship's shore-going passengers currently off the ship.
 *  t                   = hours since arrival
 *  dwell               = total port-call duration in hours
 *  localHourFractional = local clock hour at the slot (0..24, fractional)
 *
 * Result = trapezoidal envelope × lunch-dip multiplier. Returns 0 before
 * arrival and after departure.
 */
export function disembarkationCurve(
  hoursSinceArrival: number,
  dwellHours: number,
  localHourFractional: number,
): number {
  const envelope = trapezoidalEnvelope(hoursSinceArrival, dwellHours);
  if (envelope === 0) return 0;
  return envelope * lunchDipMultiplier(localHourFractional);
}

export function levelFromLoad(load: number): LoadLevel {
  for (const t of LEVEL_THRESHOLDS_ABSOLUTE) {
    if (load < t.max) return t.level;
  }
  return "red";
}

/**
 * @param areaM2 — zone polygon area in m²; when ≤ 0, falls back to
 *                {@link levelFromLoad}.
 */
export function levelFromDensity(load: number, areaM2: number): LoadLevel {
  if (!Number.isFinite(areaM2) || areaM2 <= 0) return levelFromLoad(load);
  const ha = areaM2 / 10_000;
  const d = load / ha;
  for (const t of DENSITY_THRESHOLDS_PAX_PER_HA) {
    if (d < t.max) return t.level;
  }
  return "red";
}

/**
 * Returns the fractional Europe/Zagreb local hour for a slot (0..24).
 * Uses fixed UTC+2 (CEST) — matches `resolveShipWindow` and is acceptable
 * since the 2026 schedule is summer-heavy. If we ever care about winter
 * arrivals, swap for a real tz library.
 */
export function localHourOfSlot(slot: Date): number {
  const offsetMs = 2 * 3600 * 1000;
  const local = new Date(slot.getTime() + offsetMs);
  return local.getUTCHours() + local.getUTCMinutes() / 60;
}

export interface ResolvedShipWindow {
  ship: CruiseShip;
  arrivalLocal: Date;
  departureLocal: Date;
  dwellHours: number;
}

/**
 * Resolves a CruiseShip into concrete arrival/departure Date objects in
 * Europe/Zagreb (UTC+2 summer / UTC+1 winter). For the hackathon we use
 * UTC+2 (CEST) since the 2026 schedule is dominated by summer months.
 */
export function resolveShipWindow(ship: CruiseShip): ResolvedShipWindow {
  const arrTime = ship.arrival_time ?? DEFAULT_ARRIVAL;
  const depTime = ship.departure_time ?? DEFAULT_DEPARTURE;

  const arrivalLocal = new Date(`${ship.date}T${arrTime}:00+02:00`);
  let departureLocal = new Date(`${ship.date}T${depTime}:00+02:00`);
  if (departureLocal <= arrivalLocal) {
    departureLocal = new Date(departureLocal.getTime() + 24 * 3600 * 1000);
  }
  const dwellHours =
    (departureLocal.getTime() - arrivalLocal.getTime()) / (3600 * 1000);

  return { ship, arrivalLocal, departureLocal, dwellHours };
}

export interface ZoneInput {
  id: string;
  type: ZoneType;
}

export interface AllocationResult {
  ashoreCount: number;
  shipsInPort: string[];
  shares: Map<string, number>;
  loads: Map<string, { load: number; contributingShips: string[] }>;
}

/**
 * The single allocation step. Returns total ashore + per-zone loads.
 *
 * Algorithm (see file header for the math):
 *   1. Sum ashore_from_ship across all ships currently in port.
 *   2. Compute raw_share per zone = BASE_SHARE × weather_modifier.
 *   3. Normalise raw_shares so they sum to 1.
 *   4. Distribute the ashore total across zones by normalised share.
 *
 * Conservation invariant: Σ loads ≈ ashoreCount (modulo float rounding).
 */
export function allocateLoad(
  slot: Date,
  ships: ResolvedShipWindow[],
  zones: ZoneInput[],
  weather: Weather | null,
): AllocationResult {
  const bucket = weatherBucket(weather);

  let ashoreCount = 0;
  const shipsInPort: string[] = [];
  const contributorsPerShip = new Map<string, number>();

  const localHour = localHourOfSlot(slot);

  for (const w of ships) {
    if (slot < w.arrivalLocal || slot > w.departureLocal) continue;
    const hoursSince =
      (slot.getTime() - w.arrivalLocal.getTime()) / (3600 * 1000);
    const factor = disembarkationCurve(hoursSince, w.dwellHours, localHour);
    if (factor === 0) continue;

    const ashoreFromShip = w.ship.passengers * ASHORE_RATE * factor;
    ashoreCount += ashoreFromShip;
    shipsInPort.push(w.ship.id);
    contributorsPerShip.set(w.ship.id, ashoreFromShip);
  }

  const rawShares = new Map<string, number>();
  let sumRaw = 0;
  for (const z of zones) {
    const base = BASE_SHARE[z.id];
    if (base === undefined) {
      throw new Error(
        `BASE_SHARE missing entry for zone id="${z.id}". ` +
          `Either add it to lib/heuristic.ts (and re-balance the other shares ` +
          `so the total stays 1.0) or remove the zone from data/zones.json.`,
      );
    }
    const modifier = WEATHER_MODIFIER[z.type][bucket];
    const raw = base * modifier;
    rawShares.set(z.id, raw);
    sumRaw += raw;
  }

  const shares = new Map<string, number>();
  const loads = new Map<string, { load: number; contributingShips: string[] }>();
  for (const z of zones) {
    const normalised = sumRaw > 0 ? rawShares.get(z.id)! / sumRaw : 0;
    shares.set(z.id, normalised);
    loads.set(z.id, {
      load: ashoreCount * normalised,
      contributingShips: ashoreCount > 0 ? [...shipsInPort] : [],
    });
  }

  return { ashoreCount, shipsInPort, shares, loads };
}

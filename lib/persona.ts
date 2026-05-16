/**
 * Persona analytics — turns the 30-min forecast into actionable windows
 * for the two persona pages (`/zelim-guzvu` + `/bjezim-od-guzve`).
 *
 * Pure functions. No React. No fetching. Tested via the page component.
 *
 * Vocabulary:
 *   - "busy window"  → consecutive run where a zone is at least yellow.
 *   - "calm window"  → consecutive run where a zone stays green.
 *   - "danger window"→ consecutive run where a zone hits orange or red.
 */

import type {
  CruisesFile,
  ForecastFile,
  ForecastSlot,
  LoadLevel,
  WeatherBucket,
} from "@/lib/forecast";

const SLOT_MINUTES = 30;

// ---------------------------------------------------------------------------
// Day bounds
// ---------------------------------------------------------------------------

export interface DayBounds {
  /** First slot index of the day (inclusive). */
  startIdx: number;
  /** Last slot index of the day (inclusive). */
  endIdx: number;
  /** A Date pinned to the local calendar day (00:00). */
  date: Date;
}

/** dayOffset 0 = today, 1 = tomorrow, …. Returns null if outside the horizon. */
export function getDayBounds(
  forecast: ForecastFile,
  dayOffset: number,
): DayBounds | null {
  if (forecast.time_slots.length === 0) return null;
  const first = new Date(forecast.time_slots[0]!.datetime);
  const target = new Date(first);
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + dayOffset);

  let startIdx = -1;
  let endIdx = -1;
  for (let i = 0; i < forecast.time_slots.length; i++) {
    const slot = new Date(forecast.time_slots[i]!.datetime);
    const sameDay =
      slot.getFullYear() === target.getFullYear() &&
      slot.getMonth() === target.getMonth() &&
      slot.getDate() === target.getDate();
    if (sameDay) {
      if (startIdx === -1) startIdx = i;
      endIdx = i;
    }
  }
  if (startIdx === -1) return null;
  return { startIdx, endIdx, date: target };
}

/** Generates day bounds for `dayOffset 0..n-1`, dropping any that fall outside the horizon. */
export function getHorizonDays(forecast: ForecastFile, n: number): DayBounds[] {
  const out: DayBounds[] = [];
  for (let i = 0; i < n; i++) {
    const b = getDayBounds(forecast, i);
    if (b) out.push(b);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Window scanning
// ---------------------------------------------------------------------------

const LEVEL_RANK: Record<LoadLevel, number> = {
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

export interface ZoneWindow {
  zoneId: string;
  startIdx: number;
  endIdx: number;
  /** "07:00" — local start time. */
  startTime: string;
  /** "09:00" — local end time (exclusive of last slot's start, i.e. last slot end). */
  endTime: string;
  durationMin: number;
  avgLoad: number;
  peakLoad: number;
  /** The level present in most slots of the run. */
  dominantLevel: LoadLevel;
  /** The weather bucket present in most slots of the run. */
  weatherBucket: WeatherBucket;
  /** Max simultaneous ships in port at any slot of the run. */
  shipsCount: number;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function buildWindow(
  forecast: ForecastFile,
  zoneId: string,
  startIdx: number,
  endIdx: number,
): ZoneWindow {
  const slots = forecast.time_slots.slice(startIdx, endIdx + 1);
  let sumLoad = 0;
  let peakLoad = 0;
  const levelCount: Record<LoadLevel, number> = {
    green: 0,
    yellow: 0,
    orange: 0,
    red: 0,
  };
  const weatherCount = new Map<WeatherBucket, number>();
  let maxShips = 0;

  for (const s of slots) {
    const z = s.zones[zoneId];
    if (z) {
      sumLoad += z.load;
      if (z.load > peakLoad) peakLoad = z.load;
      levelCount[z.level] += 1;
    }
    weatherCount.set(
      s.weather_bucket,
      (weatherCount.get(s.weather_bucket) ?? 0) + 1,
    );
    maxShips = Math.max(maxShips, s.ships_in_port.length);
  }

  let dominantLevel: LoadLevel = "green";
  let bestLvlCount = -1;
  // Prefer the most-severe in case of a tie so the badge reflects worst case.
  for (const lv of ["red", "orange", "yellow", "green"] as LoadLevel[]) {
    if (levelCount[lv] > bestLvlCount) {
      bestLvlCount = levelCount[lv];
      dominantLevel = lv;
    }
  }

  let dominantWeather: WeatherBucket = "default";
  let bestWxCount = -1;
  for (const [bucket, count] of weatherCount) {
    if (count > bestWxCount) {
      bestWxCount = count;
      dominantWeather = bucket;
    }
  }

  // End time = start of the slot AFTER the last slot in the run, so a 4-slot
  // run starting at 11:00 ends at 13:00 (not 12:30).
  const endIso =
    forecast.time_slots[endIdx + 1]?.datetime ??
    new Date(
      new Date(slots[slots.length - 1]!.datetime).getTime() +
        SLOT_MINUTES * 60_000,
    ).toISOString();

  return {
    zoneId,
    startIdx,
    endIdx,
    startTime: fmtTime(slots[0]!.datetime),
    endTime: fmtTime(endIso),
    durationMin: (endIdx - startIdx + 1) * SLOT_MINUTES,
    avgLoad: Math.round(sumLoad / slots.length),
    peakLoad: Math.round(peakLoad),
    dominantLevel,
    weatherBucket: dominantWeather,
    shipsCount: maxShips,
  };
}

/** Find consecutive runs of slots within `range` where `predicate` returns true. */
function findRuns(
  forecast: ForecastFile,
  zoneId: string,
  range: DayBounds,
  predicate: (slot: ForecastSlot) => boolean,
): ZoneWindow[] {
  const out: ZoneWindow[] = [];
  let runStart: number | null = null;

  for (let i = range.startIdx; i <= range.endIdx; i++) {
    const slot = forecast.time_slots[i]!;
    const ok = predicate(slot);
    if (ok && runStart === null) runStart = i;
    if (!ok && runStart !== null) {
      out.push(buildWindow(forecast, zoneId, runStart, i - 1));
      runStart = null;
    }
  }
  if (runStart !== null) {
    out.push(buildWindow(forecast, zoneId, runStart, range.endIdx));
  }
  return out;
}

function zonePredicate(
  zoneId: string,
  test: (level: LoadLevel) => boolean,
): (slot: ForecastSlot) => boolean {
  return (slot) => {
    const z = slot.zones[zoneId];
    return z ? test(z.level) : false;
  };
}

/**
 * Busy windows for a single zone — yellow or worse. Sorted by avg load (desc)
 * so the loudest moments float to the top.
 */
export function findBusyWindows(
  forecast: ForecastFile,
  zoneId: string,
  range: DayBounds,
  minDurationMin = 60,
): ZoneWindow[] {
  return findRuns(
    forecast,
    zoneId,
    range,
    zonePredicate(zoneId, (l) => LEVEL_RANK[l] >= LEVEL_RANK.yellow),
  )
    .filter((w) => w.durationMin >= minDurationMin)
    .sort((a, b) => b.avgLoad - a.avgLoad);
}

/**
 * Calm windows — green only. Sorted by duration desc (a longer calm stretch
 * is more useful than a slightly cleaner one).
 */
export function findCalmWindows(
  forecast: ForecastFile,
  zoneId: string,
  range: DayBounds,
  minDurationMin = 60,
): ZoneWindow[] {
  return findRuns(
    forecast,
    zoneId,
    range,
    zonePredicate(zoneId, (l) => l === "green"),
  )
    .filter((w) => w.durationMin >= minDurationMin)
    .sort((a, b) => b.durationMin - a.durationMin);
}

/**
 * Danger windows — orange or red. For the "calm" persona's "Pazi se!" rail.
 * Sorted by peak load desc.
 */
export function findDangerWindows(
  forecast: ForecastFile,
  zoneId: string,
  range: DayBounds,
  minDurationMin = 60,
): ZoneWindow[] {
  return findRuns(
    forecast,
    zoneId,
    range,
    zonePredicate(zoneId, (l) => LEVEL_RANK[l] >= LEVEL_RANK.orange),
  )
    .filter((w) => w.durationMin >= minDurationMin)
    .sort((a, b) => b.peakLoad - a.peakLoad);
}

// ---------------------------------------------------------------------------
// Day stats
// ---------------------------------------------------------------------------

/**
 * Sum of arriving ships' passenger capacity for a given day.
 * Matches the homepage `HomeHeader` number — the headline "incoming tourists
 * today" metric. Do NOT use sum-of-slot ashore_count for a daily total: that
 * double-counts the same passenger every slot they remain on land.
 */
export function passengersArrivingOnDay(
  cruises: CruisesFile,
  range: DayBounds,
): number {
  const dateStr = isoDate(range.date);
  let total = 0;
  for (const ship of cruises.ships) {
    if (ship.date === dateStr) total += ship.passengers;
  }
  return total;
}

/** Count of ships scheduled to arrive on a given local-calendar day. */
export function shipsArrivingOnDay(
  cruises: CruisesFile,
  range: DayBounds,
): number {
  const dateStr = isoDate(range.date);
  let n = 0;
  for (const ship of cruises.ships) {
    if (ship.date === dateStr) n += 1;
  }
  return n;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function dayPeakAshore(
  forecast: ForecastFile,
  range: DayBounds,
): { idx: number; slot: ForecastSlot } | null {
  let bestIdx = -1;
  let best = -1;
  for (let i = range.startIdx; i <= range.endIdx; i++) {
    const v = forecast.time_slots[i]!.ashore_count;
    if (v > best) {
      best = v;
      bestIdx = i;
    }
  }
  return bestIdx === -1 ? null : { idx: bestIdx, slot: forecast.time_slots[bestIdx]! };
}

/** Total minutes of green level for a single zone across the day. */
export function dayCalmMinutes(
  forecast: ForecastFile,
  zoneId: string,
  range: DayBounds,
): number {
  let n = 0;
  for (let i = range.startIdx; i <= range.endIdx; i++) {
    const z = forecast.time_slots[i]!.zones[zoneId];
    if (z && z.level === "green") n += 1;
  }
  return n * SLOT_MINUTES;
}

/** Sum of green-level minutes across all zones — proxy for "how chill is today?". */
export function dayCalmMinutesAllZones(
  forecast: ForecastFile,
  zoneIds: string[],
  range: DayBounds,
): number {
  return zoneIds.reduce(
    (acc, id) => acc + dayCalmMinutes(forecast, id, range),
    0,
  );
}

/** Count of zones that hit orange or red at any point in the day. */
export function dayDangerZonesCount(
  forecast: ForecastFile,
  zoneIds: string[],
  range: DayBounds,
): number {
  let n = 0;
  for (const id of zoneIds) {
    let hit = false;
    for (let i = range.startIdx; i <= range.endIdx && !hit; i++) {
      const z = forecast.time_slots[i]!.zones[id];
      if (z && LEVEL_RANK[z.level] >= LEVEL_RANK.orange) hit = true;
    }
    if (hit) n += 1;
  }
  return n;
}

// ---------------------------------------------------------------------------
// Multi-zone aggregation
// ---------------------------------------------------------------------------

/**
 * Find the top N busy windows across ALL given zones for the day.
 * Helpful for the persona "Sve zone" view.
 */
export function topBusyWindows(
  forecast: ForecastFile,
  zoneIds: string[],
  range: DayBounds,
  limit = 3,
  minDurationMin = 60,
): ZoneWindow[] {
  const all: ZoneWindow[] = [];
  for (const id of zoneIds) {
    all.push(...findBusyWindows(forecast, id, range, minDurationMin));
  }
  return all.sort((a, b) => b.avgLoad - a.avgLoad).slice(0, limit);
}

export function topCalmWindows(
  forecast: ForecastFile,
  zoneIds: string[],
  range: DayBounds,
  limit = 3,
  minDurationMin = 60,
): ZoneWindow[] {
  const all: ZoneWindow[] = [];
  for (const id of zoneIds) {
    all.push(...findCalmWindows(forecast, id, range, minDurationMin));
  }
  return all.sort((a, b) => b.durationMin - a.durationMin).slice(0, limit);
}

export function topDangerWindows(
  forecast: ForecastFile,
  zoneIds: string[],
  range: DayBounds,
  limit = 3,
  minDurationMin = 60,
): ZoneWindow[] {
  const all: ZoneWindow[] = [];
  for (const id of zoneIds) {
    all.push(...findDangerWindows(forecast, id, range, minDurationMin));
  }
  return all.sort((a, b) => b.peakLoad - a.peakLoad).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Time filtering — drop windows that are effectively over
// ---------------------------------------------------------------------------

/**
 * Real-clock end time of a window in ms = start of the slot AFTER the last
 * slot in the run. Falls back to last-slot-start + 30 min when the window
 * touches the end of the horizon.
 */
function windowEndMs(forecast: ForecastFile, w: ZoneWindow): number {
  const next = forecast.time_slots[w.endIdx + 1];
  if (next) return new Date(next.datetime).getTime();
  const last = forecast.time_slots[w.endIdx]!;
  return new Date(last.datetime).getTime() + SLOT_MINUTES * 60_000;
}

/**
 * Drops windows that have less than `minRemainingMin` minutes left before they
 * end. Default cutoff is 30 min — once cruisers are 30 min from departure,
 * passengers are already heading back to the ship, so a "still busy" window
 * is misleading.
 */
export function filterUpcomingWindows<W extends ZoneWindow>(
  forecast: ForecastFile,
  windows: W[],
  now: Date = new Date(),
  minRemainingMin = 30,
): W[] {
  const cutoffMs = now.getTime() + minRemainingMin * 60_000;
  return windows.filter((w) => windowEndMs(forecast, w) > cutoffMs);
}

// ---------------------------------------------------------------------------
// Merging — collapse zones that share the same (start, end, level)
// ---------------------------------------------------------------------------

/**
 * UI-facing window. Wraps one or more `ZoneWindow`s that share the same time
 * span and dominant level. `zoneIds.length === 1` is the common case (a
 * single zone); `length > 1` happens when several zones move in lockstep
 * (e.g. evening calm across the whole city).
 *
 * Numeric fields (`avgLoad`, `peakLoad`) are SUMS across the merged zones —
 * for crowds that gives a meaningful "city peak" total; for calm zones (load
 * == 0 by definition) it just stays 0.
 */
export interface DisplayWindow {
  zoneIds: string[];
  startIdx: number;
  endIdx: number;
  startTime: string;
  endTime: string;
  durationMin: number;
  avgLoad: number;
  peakLoad: number;
  dominantLevel: LoadLevel;
  weatherBucket: WeatherBucket;
  shipsCount: number;
}

/**
 * Groups zone windows that share `(startIdx, endIdx, dominantLevel)` into a
 * single `DisplayWindow`. Order of the input is preserved across groups.
 */
export function mergeWindows(windows: ZoneWindow[]): DisplayWindow[] {
  const groups = new Map<string, ZoneWindow[]>();
  const order: string[] = [];
  for (const w of windows) {
    const key = `${w.startIdx}-${w.endIdx}-${w.dominantLevel}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(w);
  }
  return order.map((key) => {
    const group = groups.get(key)!;
    const first = group[0]!;
    return {
      zoneIds: group.map((w) => w.zoneId),
      startIdx: first.startIdx,
      endIdx: first.endIdx,
      startTime: first.startTime,
      endTime: first.endTime,
      durationMin: first.durationMin,
      avgLoad: group.reduce((s, w) => s + w.avgLoad, 0),
      peakLoad: group.reduce((s, w) => s + w.peakLoad, 0),
      dominantLevel: first.dominantLevel,
      weatherBucket: first.weatherBucket,
      shipsCount: Math.max(...group.map((w) => w.shipsCount)),
    };
  });
}

// ---------------------------------------------------------------------------
// One-shot UI pipelines: find → filter past → merge → rank → slice
// ---------------------------------------------------------------------------

interface DisplayPipelineOptions {
  /** When `now` is provided, past windows are filtered. Pass undefined for non-today ranges. */
  now?: Date;
  limit?: number;
  minDurationMin?: number;
}

function pipeline(
  forecast: ForecastFile,
  zoneIds: string[],
  range: DayBounds,
  finder: (forecast: ForecastFile, zoneId: string, range: DayBounds, minDurationMin: number) => ZoneWindow[],
  rank: (a: DisplayWindow, b: DisplayWindow) => number,
  { now, limit = 3, minDurationMin = 60 }: DisplayPipelineOptions,
): DisplayWindow[] {
  const all: ZoneWindow[] = [];
  for (const id of zoneIds) all.push(...finder(forecast, id, range, minDurationMin));
  const filtered = now ? filterUpcomingWindows(forecast, all, now) : all;
  const merged = mergeWindows(filtered);
  return merged.sort(rank).slice(0, limit);
}

export function topBusyDisplayWindows(
  forecast: ForecastFile,
  zoneIds: string[],
  range: DayBounds,
  opts: DisplayPipelineOptions = {},
): DisplayWindow[] {
  return pipeline(
    forecast,
    zoneIds,
    range,
    findBusyWindows,
    (a, b) => b.peakLoad - a.peakLoad,
    opts,
  );
}

export function topCalmDisplayWindows(
  forecast: ForecastFile,
  zoneIds: string[],
  range: DayBounds,
  opts: DisplayPipelineOptions = {},
): DisplayWindow[] {
  return pipeline(
    forecast,
    zoneIds,
    range,
    findCalmWindows,
    (a, b) => b.durationMin - a.durationMin,
    opts,
  );
}

export function topDangerDisplayWindows(
  forecast: ForecastFile,
  zoneIds: string[],
  range: DayBounds,
  opts: DisplayPipelineOptions = {},
): DisplayWindow[] {
  return pipeline(
    forecast,
    zoneIds,
    range,
    findDangerWindows,
    (a, b) => b.peakLoad - a.peakLoad,
    opts,
  );
}

// ---------------------------------------------------------------------------
// Croatian-friendly UI formatters
// ---------------------------------------------------------------------------

/**
 * Picks the correct Croatian noun form for a count.
 *   1            → forms.one      ("zona")
 *   2 / 3 / 4    → forms.few      ("zone")
 *   5+ / 0       → forms.many     ("zona")
 *
 * Edge case: numbers ending in 1 but not 11 take `one`; ending in 2–4 but not
 * 12–14 take `few`; everything else takes `many`. Same rule that applies to
 * Russian/Polish-style plurals.
 */
export function pluralizeHr(
  n: number,
  forms: { one: string; few: string; many: string },
): string {
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod10 === 1 && mod100 !== 11) return forms.one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms.few;
  return forms.many;
}

/**
 * Compact, human-readable window duration. "60 min" / "2 h" / "2 h 30 min".
 * For windows >= 8 h returns "cijeli dan" — full-working-day shorthand the
 * persona cards prefer over a stale "8 h 30 min" label.
 */
export function formatWindowDuration(min: number): string {
  if (min >= 8 * 60) return "cijeli dan";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min - h * 60;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** "HH:MM" from ISO. */
export function formatHm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

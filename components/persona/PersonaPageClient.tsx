"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  CruisesFile,
  ForecastFile,
  Zone,
  ZonesFile,
} from "@/lib/forecast";
import {
  fetchCruises,
  fetchForecast,
  fetchZones,
  weatherDescriptor,
} from "@/lib/forecast";
import {
  allShipsDepartedForDay,
  dayPeakAshore,
  dayUpcomingDangerZonesCount,
  firstArrivalForDay,
  formatHm,
  getDayBounds,
  lastDepartureForDay,
  passengersArrivingOnDay,
  pluralizeHr,
  shipsArrivingOnDay,
  topBusyDisplayWindows,
  topCalmDisplayWindows,
  topDangerDisplayWindows,
  type DisplayWindow,
} from "@/lib/persona";
import { formatPassengers } from "@/lib/format";
import {
  dayLabel,
  map as mapCopy,
  mergedAdvice,
  persona as personaCopy,
  personaStatus,
  zoneAdvice,
} from "@/lib/copy";
import { PersonaHero, type PersonaVariant } from "./PersonaHero";
import { ZoneChips } from "./ZoneChips";
import { WindowCard } from "./WindowCard";
import { WeekOutlook } from "./WeekOutlook";
import { EmptyState } from "./EmptyState";
import { DayToggle, type DayOffset } from "./DayToggle";

interface PersonaPageClientProps {
  variant: PersonaVariant;
}

const ZONE_ID_KEYS = [
  "port",
  "old_town",
  "west_coast",
  "beaches",
  "malls",
] as const;
type AdviceZoneId = (typeof ZONE_ID_KEYS)[number];

const ZONE_FORMS = { one: "zona", few: "zone", many: "zona" } as const;
const SHIP_FORMS = { one: "kruzer", few: "kruzera", many: "kruzera" } as const;

/**
 * Cutoff (minutes-since-midnight) for "afternoon". Used to flip port advice
 * from `Iskrcaj` (morning, passengers fanning out) to `Ukrcaj` (heading back
 * to the ship). 14:00 keeps the mid-day arrival period as morning while
 * cleanly catching late-afternoon embarkation runs (15:00–17:00).
 */
const AFTERNOON_CUTOFF_MIN = 14 * 60;

function parseHmToMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** True when the window's midpoint sits at or after 14:00 wall-clock time. */
function isAfternoonWindow(window: DisplayWindow): boolean {
  const start = parseHmToMin(window.startTime);
  // "00:00" end means "next-day midnight" — treat as 24:00 for math.
  const end = window.endTime === "00:00" ? 24 * 60 : parseHmToMin(window.endTime);
  return (start + end) / 2 >= AFTERNOON_CUTOFF_MIN;
}

/**
 * Pick the right advice string for a (potentially merged) DisplayWindow.
 *
 *   single zone → per-zone bank in `zoneAdvice`
 *     - entries can be `string` OR `{ morning, afternoon }` (port only,
 *       to flip Iskrcaj/Ukrcaj based on time of day)
 *   multi-zone  → merged bank (city-wide vs partial)
 */
function adviceFor(
  variant: PersonaVariant,
  window: DisplayWindow,
  totalZoneCount: number,
): string | null {
  if (window.zoneIds.length === 1) {
    const id = window.zoneIds[0]!;
    if (!(ZONE_ID_KEYS as readonly string[]).includes(id)) return null;
    const entry = zoneAdvice[variant][id as AdviceZoneId];
    if (typeof entry === "string") return entry;
    return isAfternoonWindow(window) ? entry.afternoon : entry.morning;
  }
  const bank = mergedAdvice[variant];
  return window.zoneIds.length === totalZoneCount ? bank.cityWide : bank.partial;
}

export function PersonaPageClient({ variant }: PersonaPageClientProps) {
  const [forecast, setForecast] = useState<ForecastFile | null>(null);
  const [zonesFile, setZonesFile] = useState<ZonesFile | null>(null);
  const [cruises, setCruises] = useState<CruisesFile | null>(null);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [day, setDay] = useState<DayOffset>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchForecast(), fetchZones(), fetchCruises()])
      .then(([f, z, c]) => {
        if (cancelled) return;
        setForecast(f);
        setZonesFile(z);
        setCruises(c);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = useMemo(
    () => (forecast ? getDayBounds(forecast, 0) : null),
    [forecast],
  );

  /** Used to suggest "sutra opet od HH:MM" when today's ships have left. */
  const tomorrow = useMemo(
    () => (forecast ? getDayBounds(forecast, 1) : null),
    [forecast],
  );

  /** The day currently displayed in the hero/sections (today or tomorrow). */
  const bounds = day === 0 ? today : tomorrow;

  /**
   * Real-wall clock pinned at mount. We don't refresh per-tick — refresh on
   * navigation. Hackathon timescale: good enough.
   */
  const now = useMemo(() => new Date(), []);

  const zoneIds = useMemo(
    () => (zonesFile ? zonesFile.zones.map((z) => z.id) : []),
    [zonesFile],
  );

  const zonesById = useMemo(() => {
    const m = new Map<string, Zone>();
    if (zonesFile) for (const z of zonesFile.zones) m.set(z.id, z);
    return m;
  }, [zonesFile]);

  /**
   * "Sve zone" view = scan every zone, merge identical windows.
   * Filtered-zone view = scan that single zone, no merge possible.
   * Either way: pass `now` so today's past-windows are dropped. For tomorrow
   * `now` sits before every slot, so the filter is a harmless no-op.
   */
  const dayWindows = useMemo<DisplayWindow[]>(() => {
    if (!forecast || !bounds || zoneIds.length === 0) return [];
    const scope = activeZone ? [activeZone] : zoneIds;
    const opts = { now, limit: 3 };
    return variant === "crowds"
      ? topBusyDisplayWindows(forecast, scope, bounds, opts)
      : topCalmDisplayWindows(forecast, scope, bounds, opts);
  }, [forecast, bounds, zoneIds, activeZone, variant, now]);

  const dangerWindows = useMemo<DisplayWindow[]>(() => {
    if (variant !== "calm" || !forecast || !bounds || zoneIds.length === 0) {
      return [];
    }
    const scope = activeZone ? [activeZone] : zoneIds;
    return topDangerDisplayWindows(forecast, scope, bounds, { now, limit: 3 });
  }, [variant, forecast, bounds, zoneIds, activeZone, now]);

  if (error) {
    return (
      <main className="flex flex-1 items-center justify-center px-5">
        <div className="text-center">
          <div
            className="mb-2 font-sans text-[11px] font-semibold uppercase text-ink-dim"
            style={{ letterSpacing: "0.18em" }}
          >
            {mapCopy.errorPrefix}
          </div>
          <div className="font-mono text-[13px] text-ink">{error}</div>
        </div>
      </main>
    );
  }

  if (!forecast || !zonesFile || !cruises || !today || !bounds) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <span className="font-sans text-[13px] font-medium text-ink-dim">
          {mapCopy.loading}
        </span>
      </main>
    );
  }

  // ----- Hero metrics for the currently selected day -----------------------
  const passengersOnDay = passengersArrivingOnDay(cruises, bounds);
  const shipsOnDay = shipsArrivingOnDay(cruises, bounds);
  const peak = dayPeakAshore(forecast, bounds);
  const peakWeather = peak ? weatherDescriptor(peak.slot.weather_bucket) : null;

  /**
   * Real-clock state. Only meaningful for today — tomorrow's ships haven't
   * arrived yet, so `allDeparted` is always false and we route to the
   * "upcoming" branch instead. Danger count uses `now` as cutoff; for
   * tomorrow that's before every slot, so the full day is counted.
   */
  const isToday = day === 0;
  const allDeparted = isToday && allShipsDepartedForDay(cruises, bounds, now);
  const dangerCount = dayUpcomingDangerZonesCount(forecast, zoneIds, bounds, now);
  const lastDep = allDeparted ? lastDepartureForDay(cruises, bounds) : null;
  const nextArrivalTomorrow =
    isToday && tomorrow ? firstArrivalForDay(cruises, tomorrow) : null;
  const firstArrivalOnDay = !isToday ? firstArrivalForDay(cruises, bounds) : null;

  /**
   * Context line: factual summary of the day. We keep the peak/ship/weather
   * triplet even after departures — the user explicitly wants to see what
   * was. The "they're gone" / "they're coming" message lives below.
   */
  const dayWord = isToday ? "danas" : "sutra";
  const contextParts: string[] = [];
  if (passengersOnDay > 0 && peak) {
    contextParts.push(`vrh ~${formatHm(peak.slot.datetime)}`);
  }
  if (shipsOnDay > 0) {
    contextParts.push(`${shipsOnDay} ${pluralizeHr(shipsOnDay, SHIP_FORMS)}`);
  }
  if (peakWeather && passengersOnDay > 0) {
    contextParts.push(`${peakWeather.hint} ${peakWeather.label.toLowerCase()}`);
  }
  const contextLine =
    contextParts.length > 0
      ? contextParts.join(" · ")
      : `Bez kruzera u luci ${dayWord}.`;

  /**
   * State machine for the warning line.
   *
   *   no ships on day            → null (context line already states it)
   *   today + all departed       → "they're gone" sentence
   *   today + ships still around → live status (calm prioritizes danger)
   *   tomorrow                   → anticipatory status
   *                                (calm shows risk only when red zones exist)
   */
  let warningLine: string | null = null;
  if (passengersOnDay > 0) {
    if (isToday) {
      if (allDeparted && lastDep) {
        warningLine =
          variant === "crowds"
            ? personaStatus.crowds.departed(lastDep, nextArrivalTomorrow)
            : personaStatus.calm.departed(lastDep, nextArrivalTomorrow);
      } else if (variant === "calm" && dangerCount > 0) {
        warningLine = personaStatus.calm.risk(
          `${dangerCount} ${pluralizeHr(dangerCount, ZONE_FORMS)} crveno`,
        );
      } else if (variant === "crowds") {
        warningLine = personaStatus.crowds.active;
      }
    } else {
      if (variant === "crowds" && firstArrivalOnDay) {
        warningLine = personaStatus.crowds.upcoming(firstArrivalOnDay);
      } else if (variant === "calm") {
        warningLine =
          dangerCount > 0
            ? personaStatus.calm.risk(
                `${dangerCount} ${pluralizeHr(dangerCount, ZONE_FORMS)} crveno`,
              )
            : personaStatus.calm.quietDay;
      }
    }
  }

  const heroBig = passengersOnDay > 0 ? formatPassengers(passengersOnDay) : "0";
  const heroSuffix = `putnika ${dayWord}`;

  const dayCopy = personaCopy[variant];
  const sectionLabel = isToday ? dayCopy.sectionToday : dayCopy.sectionTomorrow;
  const emptyMessage = activeZone
    ? dayCopy.emptyZone
    : isToday
      ? dayCopy.emptyToday
      : dayCopy.emptyTomorrow;
  const dangerEmptyMessage =
    variant === "calm"
      ? isToday
        ? personaCopy.calm.emptyDanger
        : personaCopy.calm.emptyDangerTomorrow
      : "";
  const tone: "crowds" | "calm" = variant;
  const totalZoneCount = zoneIds.length;

  return (
    <main className="flex flex-1 flex-col bg-cream pb-12">
      <PersonaHero
        variant={variant}
        eyebrow={personaCopy[variant].eyebrow}
        bigNumber={heroBig}
        bigSuffix={heroSuffix}
        contextLine={contextLine}
        warningLine={warningLine}
      />

      <DayToggle
        value={day}
        onChange={setDay}
        variant={variant}
        labels={dayLabel}
      />

      <ZoneChips
        zones={zonesFile.zones}
        value={activeZone}
        onChange={setActiveZone}
        variant={variant}
        allLabel={personaCopy[variant].chipsAll}
      />

      <SectionHeading label={sectionLabel} />
      <div className="px-5">
        {dayWindows.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <div className="flex flex-col gap-3">
            {dayWindows.map((w) => (
              <WindowCard
                key={`${w.startIdx}-${w.endIdx}-${w.zoneIds.join("+")}`}
                window={w}
                zonesById={zonesById}
                totalZoneCount={totalZoneCount}
                tone={tone}
                advice={adviceFor(variant, w, totalZoneCount)}
              />
            ))}
          </div>
        )}
      </div>

      {variant === "calm" && (
        <>
          <SectionHeading
            label={personaCopy.calm.sectionDanger}
            accentClass="text-coral"
          />
          <div className="px-5">
            {dangerWindows.length === 0 ? (
              <EmptyState message={dangerEmptyMessage} />
            ) : (
              <div className="flex flex-col gap-3">
                {dangerWindows.map((w) => (
                  <WindowCard
                    key={`danger-${w.startIdx}-${w.endIdx}-${w.zoneIds.join("+")}`}
                    window={w}
                    zonesById={zonesById}
                    totalZoneCount={totalZoneCount}
                    tone="danger"
                    advice={null}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="px-5 mt-4">
        <Link
          href="/map"
          className={`inline-flex items-center gap-1.5 font-sans text-[13px] font-medium transition-colors duration-150 ${
            variant === "calm"
              ? "text-teal hover:text-ink"
              : "text-amber hover:text-ink"
          }`}
        >
          Pogledaj na karti
          <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
      </div>

      <WeekOutlook
        forecast={forecast}
        cruises={cruises}
        zones={zonesFile.zones}
        variant={variant}
        selectedDayOffset={day}
      />

      <footer className="px-5 mt-10 text-center text-ink-dim font-sans text-[13px]">
        Demo · Hackathon Split 2026
      </footer>
    </main>
  );
}

interface SectionHeadingProps {
  label: string;
  accentClass?: string;
}

function SectionHeading({ label, accentClass }: SectionHeadingProps) {
  return (
    <h2
      className={`px-5 mt-8 mb-3 font-sans text-[11px] font-semibold uppercase ${accentClass ?? "text-ink-dim"}`}
      style={{ letterSpacing: "0.18em" }}
    >
      {label}
    </h2>
  );
}

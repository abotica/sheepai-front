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
  dayDangerZonesCount,
  dayPeakAshore,
  formatHm,
  getDayBounds,
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
  map as mapCopy,
  mergedAdvice,
  persona as personaCopy,
  zoneAdvice,
} from "@/lib/copy";
import { PersonaHero, type PersonaVariant } from "./PersonaHero";
import { ZoneChips } from "./ZoneChips";
import { WindowCard } from "./WindowCard";
import { WeekOutlook } from "./WeekOutlook";
import { EmptyState } from "./EmptyState";

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
 * Pick the right advice string for a (potentially merged) DisplayWindow.
 * Single-zone → per-zone bank; multi-zone → merged bank (city-wide vs partial).
 */
function adviceFor(
  variant: PersonaVariant,
  window: DisplayWindow,
  totalZoneCount: number,
): string | null {
  if (window.zoneIds.length === 1) {
    const id = window.zoneIds[0]!;
    if (!(ZONE_ID_KEYS as readonly string[]).includes(id)) return null;
    return zoneAdvice[variant][id as AdviceZoneId];
  }
  const bank = mergedAdvice[variant];
  return window.zoneIds.length === totalZoneCount ? bank.cityWide : bank.partial;
}

export function PersonaPageClient({ variant }: PersonaPageClientProps) {
  const [forecast, setForecast] = useState<ForecastFile | null>(null);
  const [zonesFile, setZonesFile] = useState<ZonesFile | null>(null);
  const [cruises, setCruises] = useState<CruisesFile | null>(null);
  const [activeZone, setActiveZone] = useState<string | null>(null);
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
   * Either way: drop windows that have <30 min remaining today.
   */
  const todayWindows = useMemo<DisplayWindow[]>(() => {
    if (!forecast || !today || zoneIds.length === 0) return [];
    const scope = activeZone ? [activeZone] : zoneIds;
    const opts = { now, limit: 3 };
    return variant === "crowds"
      ? topBusyDisplayWindows(forecast, scope, today, opts)
      : topCalmDisplayWindows(forecast, scope, today, opts);
  }, [forecast, today, zoneIds, activeZone, variant, now]);

  const dangerWindows = useMemo<DisplayWindow[]>(() => {
    if (variant !== "calm" || !forecast || !today || zoneIds.length === 0) {
      return [];
    }
    const scope = activeZone ? [activeZone] : zoneIds;
    return topDangerDisplayWindows(forecast, scope, today, { now, limit: 3 });
  }, [variant, forecast, today, zoneIds, activeZone, now]);

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

  if (!forecast || !zonesFile || !cruises || !today) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <span className="font-sans text-[13px] font-medium text-ink-dim">
          {mapCopy.loading}
        </span>
      </main>
    );
  }

  // ----- Shared hero metric across BOTH personas ---------------------------
  const passengersToday = passengersArrivingOnDay(cruises, today);
  const shipsToday = shipsArrivingOnDay(cruises, today);
  const peak = dayPeakAshore(forecast, today);
  const peakWeather = peak ? weatherDescriptor(peak.slot.weather_bucket) : null;
  const dangerCount = dayDangerZonesCount(forecast, zoneIds, today);

  const contextParts: string[] = [];
  if (passengersToday > 0 && peak) {
    contextParts.push(`vrh ~${formatHm(peak.slot.datetime)}`);
  }
  if (shipsToday > 0) {
    contextParts.push(`${shipsToday} ${pluralizeHr(shipsToday, SHIP_FORMS)}`);
  }
  if (peakWeather && passengersToday > 0) {
    contextParts.push(`${peakWeather.hint} ${peakWeather.label.toLowerCase()}`);
  }
  const contextLine =
    contextParts.length > 0
      ? contextParts.join(" · ")
      : "Bez kruzera u luci danas.";

  const warningLine =
    variant === "calm" && dangerCount > 0
      ? `${dangerCount} ${pluralizeHr(dangerCount, ZONE_FORMS)} crveno · planiraj oprezno`
      : variant === "crowds" && passengersToday > 0
        ? "Naplata otvorena."
        : null;

  const heroBig = passengersToday > 0 ? formatPassengers(passengersToday) : "0";
  const heroSuffix = "putnika danas";

  const todayLabel = personaCopy[variant].sectionToday;
  const todayEmptyMessage = activeZone
    ? personaCopy[variant].emptyZone
    : personaCopy[variant].emptyToday;
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

      <ZoneChips
        zones={zonesFile.zones}
        value={activeZone}
        onChange={setActiveZone}
        variant={variant}
        allLabel={personaCopy[variant].chipsAll}
      />

      <SectionHeading label={todayLabel} />
      <div className="px-5">
        {todayWindows.length === 0 ? (
          <EmptyState message={todayEmptyMessage} />
        ) : (
          <div className="flex flex-col gap-3">
            {todayWindows.map((w) => (
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
              <EmptyState message={personaCopy.calm.emptyDanger} />
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

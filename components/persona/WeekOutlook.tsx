import type { CruisesFile, ForecastFile, Zone } from "@/lib/forecast";
import {
  dayCalmMinutesAllZones,
  getHorizonDays,
  passengersArrivingOnDay,
  type DayBounds,
} from "@/lib/persona";
import { formatK } from "@/lib/format";
import { persona as personaCopy } from "@/lib/copy";
import type { PersonaVariant } from "./PersonaHero";

interface WeekOutlookProps {
  forecast: ForecastFile;
  cruises: CruisesFile;
  zones: Zone[];
  variant: PersonaVariant;
  /**
   * Index (0–6) of the day currently shown in the hero / sections above.
   * The bar grid highlights ONLY this day — no winner glow — so the visual
   * answers "which day am I looking at?". The ranking list below already
   * communicates which days are the most/least busy.
   */
  selectedDayOffset?: number;
}

const DAY_SHORT_HR = ["NED", "PON", "UTO", "SRI", "ČET", "PET", "SUB"] as const;
const BAR_TRACK = 48;

const VARIANT = {
  crowds: {
    bestColor: "#D88A0E",
    bestBg: "#FBF1DC",
    bestBorder: "#D88A0E",
    bestShadow: "0 6px 18px -10px #D88A0E80",
    barColor: "#D88A0E",
    accent: "text-amber",
    rankHeading: "amber",
  },
  calm: {
    bestColor: "#2E7E80",
    bestBg: "#E5F1F1",
    bestBorder: "#2E7E80",
    bestShadow: "0 6px 18px -10px #2E7E8080",
    barColor: "#2E7E80",
    accent: "text-teal",
    rankHeading: "teal",
  },
} satisfies Record<
  PersonaVariant,
  {
    bestColor: string;
    bestBg: string;
    bestBorder: string;
    bestShadow: string;
    barColor: string;
    accent: string;
    rankHeading: string;
  }
>;

interface DayRow {
  bounds: DayBounds;
  dayLabel: (typeof DAY_SHORT_HR)[number];
  /** Persona-relevant scalar — higher is "more of this persona's thing". */
  score: number;
  /** Display number (e.g. passengers ashore total, or calm hours). */
  display: string;
}

export function WeekOutlook({
  forecast,
  cruises,
  zones,
  variant,
  selectedDayOffset = 0,
}: WeekOutlookProps) {
  const v = VARIANT[variant];
  const days = getHorizonDays(forecast, 7);
  if (days.length === 0) return null;

  const zoneIds = zones.map((z) => z.id);

  const rows: DayRow[] = days.map((bounds) => {
    if (variant === "crowds") {
      // Same metric as the homepage 7-day card: sum of arriving-ship capacity.
      const total = passengersArrivingOnDay(cruises, bounds);
      return {
        bounds,
        dayLabel: DAY_SHORT_HR[bounds.date.getDay()] as (typeof DAY_SHORT_HR)[number],
        score: total,
        display: total > 0 ? formatK(total) : "–",
      };
    }
    // calm: average green minutes across zones, expressed in hours per zone.
    const calmMin = dayCalmMinutesAllZones(forecast, zoneIds, bounds);
    const calmHPerZone = zoneIds.length
      ? Math.round(calmMin / zoneIds.length / 60)
      : 0;
    return {
      bounds,
      dayLabel: DAY_SHORT_HR[bounds.date.getDay()] as (typeof DAY_SHORT_HR)[number],
      score: calmMin,
      display: calmHPerZone > 0 ? `${calmHPerZone}h` : "–",
    };
  });

  const maxScore = Math.max(1, ...rows.map((r) => r.score));
  const sortedDesc = [...rows].sort((a, b) => b.score - a.score);
  const top3 = sortedDesc.slice(0, 3).filter((r) => r.score > 0);
  /**
   * Clamp the caller-supplied offset to the horizon so an out-of-range value
   * (e.g. forecast shorter than expected) still produces a valid highlight.
   */
  const selectedIdx = Math.min(Math.max(0, selectedDayOffset), rows.length - 1);

  return (
    <section className="px-5 mt-8">
      <div className="flex items-baseline justify-between mb-4">
        <h2
          className="font-display font-semibold text-[22px] text-ink"
          style={{ letterSpacing: "-0.5px" }}
        >
          {personaCopy[variant].sectionWeek}
        </h2>
        <span
          className={`font-mono text-[10px] font-medium uppercase tabular-nums ${v.accent}`}
          style={{ letterSpacing: "0.15em" }}
        >
          {personaCopy[variant].weekRankLabel}
        </span>
      </div>

      <div className="flex gap-1.5">
        {rows.map((row, idx) => {
          const selected = idx === selectedIdx;
          const h = Math.max(3, Math.round((row.score / maxScore) * BAR_TRACK));
          return (
            <div
              key={row.bounds.date.toISOString()}
              className="flex-1 flex flex-col items-center rounded-2xl border py-3 gap-2"
              style={
                selected
                  ? {
                      backgroundColor: "#FFFFFF",
                      borderColor: v.bestBorder,
                      boxShadow: v.bestShadow,
                    }
                  : {
                      backgroundColor: "#FBF8F2",
                      borderColor: "#E8E0D2",
                    }
              }
            >
              <span
                className="font-sans text-[9px] font-semibold uppercase"
                style={{
                  letterSpacing: "0.12em",
                  color: selected ? v.bestColor : "#5A6B78",
                }}
              >
                {row.dayLabel}
              </span>

              <div
                className="flex items-end justify-center"
                style={{ height: BAR_TRACK }}
              >
                {row.score > 0 ? (
                  <div
                    style={{
                      width: 8,
                      height: h,
                      backgroundColor: v.barColor,
                      borderRadius: "2px 2px 0 0",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 8,
                      height: 2,
                      backgroundColor: "#E8E0D2",
                      borderRadius: 1,
                    }}
                  />
                )}
              </div>

              <span className="font-mono text-[10px] font-semibold text-ink tabular-nums">
                {row.display}
              </span>
            </div>
          );
        })}
      </div>

      {top3.length > 0 && (
        <ol className="mt-4 flex flex-col gap-1.5">
          {top3.map((row, i) => {
            const dayName = row.dayLabel;
            const dom = row.bounds.date.getDate();
            return (
              <li
                key={row.bounds.date.toISOString()}
                className="flex items-baseline justify-between font-sans text-[13px]"
              >
                <span className="flex items-baseline gap-2">
                  <span
                    className={`font-mono text-[10px] font-semibold tabular-nums ${v.accent}`}
                    style={{ letterSpacing: "0.12em" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-ink">
                    {dayName} · {dom}.
                  </span>
                </span>
                <span className="font-mono text-[12px] tabular-nums text-ink-dim">
                  {row.display}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

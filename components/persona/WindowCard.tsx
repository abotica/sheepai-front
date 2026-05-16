import type { Zone } from "@/lib/forecast";
import { levelColor, weatherDescriptor } from "@/lib/forecast";
import type { DisplayWindow } from "@/lib/persona";
import { formatWindowDuration, pluralizeHr } from "@/lib/persona";
import { formatPassengers } from "@/lib/format";
import { mergedLabels, zoneShortName } from "@/lib/copy";

const ZONE_FORMS = { one: "zona", few: "zone", many: "zona" } as const;

export type WindowCardTone = "crowds" | "calm" | "danger";

interface WindowCardProps {
  window: DisplayWindow;
  /** All zones in the forecast — used to look up names + detect "city-wide". */
  zonesById: Map<string, Zone>;
  totalZoneCount: number;
  tone: WindowCardTone;
  /** Short Croatian advice line. */
  advice?: string | null;
}

const TONE = {
  crowds: {
    border: "border-rule",
    bigAccent: "text-amber",
    bigSuffix: "putnika u špici",
    big: "peak" as const,
    showLevel: true,
  },
  calm: {
    border: "border-rule",
    bigAccent: "text-teal",
    bigSuffix: "h mira",
    big: "duration" as const,
    /** "Mirno" pill is redundant when the hero says "h mira". */
    showLevel: false,
  },
  danger: {
    border: "border-coral/40",
    bigAccent: "text-coral",
    bigSuffix: "putnika u špici",
    big: "peak" as const,
    showLevel: true,
  },
} satisfies Record<
  WindowCardTone,
  {
    border: string;
    bigAccent: string;
    bigSuffix: string;
    big: "peak" | "duration";
    showLevel: boolean;
  }
>;

export function WindowCard({
  window,
  zonesById,
  totalZoneCount,
  tone,
  advice,
}: WindowCardProps) {
  const t = TONE[tone];
  const wx = weatherDescriptor(window.weatherBucket);
  const lvl = levelColor(window.dominantLevel);

  const eyebrow = buildEyebrow(window, zonesById, totalZoneCount);
  const heroNumber =
    t.big === "peak"
      ? formatPassengers(window.peakLoad)
      : durationHero(window.durationMin);
  const durationLabel = formatWindowDuration(window.durationMin);

  // "Default" weather bucket means "nothing interesting" — hide so the meta
  // row stays informative instead of just "mirno" twice.
  const showWeather = window.weatherBucket !== "default";

  return (
    <article
      className={`flex flex-col gap-2.5 rounded-2xl border bg-paper p-5 ${t.border}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className="font-sans text-[10px] font-semibold uppercase text-ink-dim min-w-0 truncate"
          style={{ letterSpacing: "0.16em" }}
        >
          {eyebrow}
        </span>
        <span
          className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-ink-dim"
          style={{ letterSpacing: "0.05em" }}
        >
          {formatTimeRange(window.startTime, window.endTime)}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={`font-display text-[44px] font-bold leading-none tabular-nums ${t.bigAccent}`}
          style={{ letterSpacing: "-1px" }}
        >
          {heroNumber}
        </span>
        <span className="font-sans text-[13px] font-medium italic text-ink-dim">
          {t.bigSuffix}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-ink-dim">
        {t.showLevel && (
          <>
            <span className="inline-flex items-center gap-1">
              <span
                aria-hidden
                className="inline-block h-[5px] w-[5px] rounded-full"
                style={{ backgroundColor: lvl.stroke }}
              />
              <span style={{ color: lvl.stroke }}>{lvl.label}</span>
            </span>
            <span className="text-rule">·</span>
          </>
        )}
        <span>{durationLabel}</span>
        {showWeather && (
          <>
            <span className="text-rule">·</span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>{wx.hint}</span>
              <span>{wx.label.toLowerCase()}</span>
            </span>
          </>
        )}
        <span className="text-rule">·</span>
        {window.shipsCount > 0 ? (
          <span className="tabular-nums">
            {window.shipsCount}{" "}
            {window.shipsCount === 1 ? "kruzer" : "kruzera"}
          </span>
        ) : (
          <span>bez kruzera</span>
        )}
      </div>

      {advice && (
        <p className="font-sans text-[14px] leading-snug text-ink mt-1">
          {advice}
        </p>
      )}
    </article>
  );
}

/**
 * For merged windows we need a label that fits a single eyebrow row even when
 * Croatian zone names get long ("Trajektna luka i lučko područje"):
 *   - 1 zone             → "Stari grad"
 *   - all forecast zones → "Cijeli grad"
 *   - 2–3 partial        → "Stari grad · Bačvice" (named so the user knows
 *                          WHICH zones got merged; uses short names from
 *                          `zoneShortName` to keep the row scannable)
 *   - 4+ partial         → "4 zone" / "5 zona" (too many names to fit)
 */
function buildEyebrow(
  window: DisplayWindow,
  zonesById: Map<string, Zone>,
  totalZoneCount: number,
): string {
  const count = window.zoneIds.length;
  if (count === 1) {
    return zonesById.get(window.zoneIds[0]!)?.name_hr ?? window.zoneIds[0]!;
  }
  if (count === totalZoneCount) {
    return mergedLabels.cityWide;
  }
  if (count <= 3) {
    return window.zoneIds
      .map((id) => zoneShortName[id] ?? zonesById.get(id)?.name_hr ?? id)
      .join(" · ");
  }
  return `${count} ${pluralizeHr(count, ZONE_FORMS)}`;
}

/**
 * Forecast slots are half-hour buckets indexed off midnight, so a window
 * ending at end-of-day comes back as "00:00" (the next midnight). Rendering
 * "00:00–00:00" looks like a glitch. Two conventions:
 *   - end "00:00" → "24:00" (standard transit shorthand for end-of-day)
 *   - start "00:00" + end "24:00" → "cijeli dan" (the whole-day case)
 */
function formatTimeRange(startTime: string, endTime: string): string {
  const end = endTime === "00:00" ? "24:00" : endTime;
  if (startTime === "00:00" && end === "24:00") return "cijeli dan";
  return `${startTime}–${end}`;
}

function durationHero(min: number): string {
  if (min >= 8 * 60) return "8+";
  const h = min / 60;
  if (Number.isInteger(h)) return `${h}`;
  return h.toLocaleString("hr-HR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

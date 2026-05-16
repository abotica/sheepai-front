"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForecastFile, ShipEvent, ShipEventType } from "@/lib/forecast";
import {
  findClosestSlotIndex,
  formatSlotTime,
  sameDay,
} from "@/lib/forecast";
import { formatPassengers } from "@/lib/format";
import { map as copy } from "@/lib/copy";
import { usePrefersTouchUi } from "@/hooks/useMediaQuery";

const SLOTS_PER_DAY = 48;
export const MOBILE_TIMELINE_DAYS = 2;

const ARRIVAL_STROKE = "#D9614B";
const ARRIVAL_FILL = "#D9614B";
const DEPARTURE_STROKE = "#5A6B78";
const DEPARTURE_FILL = "#FBF8F2";

interface TimeSliderProps {
  forecast: ForecastFile;
  slotIndex: number;
  onSlotChange: (next: number) => void;
  events?: ShipEvent[];
  /** Last valid slot index (e.g. shortened mobile horizon). */
  maxSlotIndex?: number;
  legendHintText?: string;
}

interface EventCluster {
  key: string;
  slotIndex: number;
  type: ShipEventType;
  events: ShipEvent[];
}

export function mobileTimelineSlotCap(forecast: ForecastFile): number {
  return Math.min(
    MOBILE_TIMELINE_DAYS * SLOTS_PER_DAY,
    forecast.time_slots.length,
  );
}

export function TimeSlider({
  forecast,
  slotIndex,
  onSlotChange,
  events = [],
  maxSlotIndex: maxSlotIndexProp,
  legendHintText,
}: TimeSliderProps) {
  const prefersTouchUi = usePrefersTouchUi();
  const maxSlotIndex =
    maxSlotIndexProp ?? Math.max(0, forecast.time_slots.length - 1);
  const max = maxSlotIndex;
  const currentSlot = forecast.time_slots[slotIndex];
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const legend =
    legendHintText ?? (prefersTouchUi ? copy.legendHintMobile : copy.legendHint);

  const visibleEvents = useMemo(
    () => events.filter((e) => e.slotIndex <= max),
    [events, max],
  );

  const dayBoundaries = useMemo(() => {
    const out: number[] = [];
    for (let i = 1; i <= max; i++) {
      if (
        !sameDay(
          forecast.time_slots[i]!.datetime,
          forecast.time_slots[i - 1]!.datetime,
        )
      ) {
        out.push(i);
      }
    }
    return out;
  }, [forecast, max]);

  const clusters = useMemo<EventCluster[]>(() => {
    const m = new Map<string, EventCluster>();
    for (const e of visibleEvents) {
      const key = `${e.slotIndex}-${e.type}`;
      const existing = m.get(key);
      if (existing) existing.events.push(e);
      else
        m.set(key, {
          key,
          slotIndex: e.slotIndex,
          type: e.type,
          events: [e],
        });
    }
    return Array.from(m.values());
  }, [visibleEvents]);

  const activeCluster = useMemo(() => {
    if (!activeKey) return null;
    return clusters.find((c) => c.key === activeKey) ?? null;
  }, [activeKey, clusters]);

  const dismissSheet = useCallback(() => setActiveKey(null), []);

  useEffect(() => {
    if (!activeKey || !prefersTouchUi) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Element | null;
      if (t?.closest("[data-event-sheet]") || t?.closest("[data-event-marker]")) {
        return;
      }
      setActiveKey(null);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [activeKey, prefersTouchUi]);

  useEffect(() => {
    if (!activeKey || prefersTouchUi) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest("[data-event-marker]")) {
        setActiveKey(null);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [activeKey, prefersTouchUi]);

  const goNow = () =>
    onSlotChange(Math.min(findClosestSlotIndex(forecast), max));
  const step = (delta: number) =>
    onSlotChange(Math.max(0, Math.min(max, slotIndex + delta)));

  // Keep refs so interval callbacks always read the latest values
  const slotIndexRef = useRef(slotIndex);
  const maxRef = useRef(max);
  useEffect(() => { slotIndexRef.current = slotIndex; }, [slotIndex]);
  useEffect(() => { maxRef.current = max; }, [max]);

  const hold = useRef<{
    timeout: ReturnType<typeof setTimeout> | null;
    interval: ReturnType<typeof setInterval> | null;
    active: boolean;
  }>({ timeout: null, interval: null, active: false });

  function startHold(delta: number) {
    hold.current.active = false;
    hold.current.timeout = setTimeout(() => {
      hold.current.active = true;
      hold.current.interval = setInterval(() => {
        onSlotChange(Math.max(0, Math.min(maxRef.current, slotIndexRef.current + delta)));
      }, 80);
    }, 350);
  }

  function stopHold() {
    if (hold.current.timeout) clearTimeout(hold.current.timeout);
    if (hold.current.interval) clearInterval(hold.current.interval);
    hold.current.timeout = null;
    hold.current.interval = null;
  }

  if (!currentSlot) return null;

  const denom = Math.max(1, max);

  return (
    <div className="flex flex-col gap-3 border-t border-rule bg-paper px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-5 sm:pt-4">
      {prefersTouchUi && activeCluster && (
        <>
          <button
            type="button"
            aria-label={copy.closeDetail}
            className="fixed inset-0 z-[500] touch-none bg-ink/25"
            onClick={dismissSheet}
          />
          <div
            data-event-sheet
            className="fixed left-2 right-2 z-[510] max-h-[min(52vh,420px)] overflow-y-auto overscroll-contain rounded-2xl border border-rule bg-paper px-4 py-3 shadow-[0_-8px_30px_-6px_rgba(10,31,46,0.18)]"
            style={{
              bottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <EventSheetBody cluster={activeCluster} onClose={dismissSheet} />
          </div>
        </>
      )}

      <div
        className="flex items-center justify-between gap-2 font-sans text-[10px] font-semibold uppercase text-ink-dim sm:text-[11px]"
        style={{ letterSpacing: "0.16em" }}
      >
        <span className="min-w-0 leading-snug">{legend}</span>
        <button
          type="button"
          onClick={goNow}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-coral px-3 text-[10px] tracking-[0.16em] font-semibold text-paper transition-opacity duration-150 hover:opacity-90 sm:h-7 sm:text-[11px]"
        >
          {copy.nowButton}
        </button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        <button
          type="button"
          onClick={() => { if (hold.current.active) { hold.current.active = false; return; } step(-1); }}
          onPointerDown={() => startHold(-1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          disabled={slotIndex === 0}
          aria-label="Prethodni interval"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-cream transition-opacity duration-150 hover:opacity-80 disabled:opacity-20 sm:size-10"
        >
          <span className="text-base leading-none">‹</span>
        </button>

        <div className="relative min-w-0 flex-1 pt-5 sm:pt-6">
          <div className="pointer-events-none absolute inset-x-0 -top-1 h-5 sm:-top-0.5">
            {clusters.map((c) => (
              <EventMarker
                key={c.key}
                cluster={c}
                pct={(c.slotIndex / denom) * 100}
                active={activeKey === c.key}
                prefersTouchUi={prefersTouchUi}
                onActivate={() => {
                  setActiveKey(c.key);
                  onSlotChange(c.slotIndex);
                }}
                onHover={(hovered) => {
                  if (prefersTouchUi) return;
                  if (hovered) setActiveKey(c.key);
                  else if (activeKey === c.key) setActiveKey(null);
                }}
              />
            ))}
          </div>

          <input
            type="range"
            min={0}
            max={max}
            step={1}
            value={Math.min(slotIndex, max)}
            onChange={(e) => onSlotChange(Number(e.target.value))}
            className="h-2 w-full cursor-pointer touch-manipulation appearance-none rounded-full bg-cream accent-coral"
            aria-label="Vrijeme prognoze"
          />

          {dayBoundaries.length > 0 && (
            <div className="pointer-events-none absolute inset-0 flex">
              {dayBoundaries.map((b) => (
                <div
                  key={b}
                  className="absolute top-0 bottom-0 w-px bg-rule"
                  style={{ left: `${(b / denom) * 100}%` }}
                />
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => { if (hold.current.active) { hold.current.active = false; return; } step(1); }}
          onPointerDown={() => startHold(1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          disabled={slotIndex >= max}
          aria-label="Sljedeći interval"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-cream transition-opacity duration-150 hover:opacity-80 disabled:opacity-20 sm:size-10"
        >
          <span className="text-base leading-none">›</span>
        </button>
      </div>

      <div className="flex justify-between font-mono text-[10px] tabular-nums text-ink-mute sm:text-[11px]">
        <span>{formatSlotTime(forecast.time_slots[0]!.datetime)}</span>
        <span className="font-semibold text-ink-dim">
          {formatSlotTime(currentSlot.datetime)}
        </span>
        <span>{formatSlotTime(forecast.time_slots[max]!.datetime)}</span>
      </div>
    </div>
  );
}

interface EventMarkerProps {
  cluster: EventCluster;
  pct: number;
  active: boolean;
  prefersTouchUi: boolean;
  onActivate: () => void;
  onHover: (hovered: boolean) => void;
}

function EventMarker({
  cluster,
  pct,
  active,
  prefersTouchUi,
  onActivate,
  onHover,
}: EventMarkerProps) {
  const isArrival = cluster.type === "arrival";
  const eventLabel = isArrival ? copy.arrivalLabel : copy.departureLabel;
  const time = formatSlotTime(cluster.events[0]!.datetime);
  const anyInferred = cluster.events.some((e) => e.timeInferred);
  const names = cluster.events.map((e) => e.ship.ship_name).join(", ");
  const stroke = isArrival ? ARRIVAL_STROKE : DEPARTURE_STROKE;
  const fill = isArrival ? ARRIVAL_FILL : DEPARTURE_FILL;

  return (
    <div
      data-event-marker
      className="pointer-events-auto absolute top-0 -translate-x-1/2"
      style={{ left: `${pct}%` }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onActivate();
        }}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onFocus={() => {
          if (!prefersTouchUi) onHover(true);
        }}
        onBlur={() => {
          if (!prefersTouchUi) onHover(false);
        }}
        aria-expanded={active}
        aria-label={`${eventLabel} · ${names} · ${time}${anyInferred ? ` · ${copy.eventInferredHint}` : ""}`}
        className="relative flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-coral/40 sm:size-5"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 10 10"
          className={`transition-transform duration-150 ${active ? "scale-125" : "scale-100"}`}
          aria-hidden="true"
        >
          {isArrival ? (
            <path
              d="M5 9 L0.5 1.5 L9.5 1.5 Z"
              fill={fill}
              stroke={stroke}
              strokeWidth={anyInferred ? 1.5 : 1}
              strokeDasharray={anyInferred ? "2 1" : undefined}
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M5 1 L9.5 8.5 L0.5 8.5 Z"
              fill={fill}
              stroke={stroke}
              strokeWidth={anyInferred ? 1.5 : 1}
              strokeDasharray={anyInferred ? "2 1" : undefined}
              strokeLinejoin="round"
            />
          )}
        </svg>
        {cluster.events.length > 1 && (
          <span
            className="absolute -right-1 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-coral px-0.5 font-sans text-[9px] font-semibold leading-none text-paper"
            aria-hidden="true"
          >
            {cluster.events.length}
          </span>
        )}
        {anyInferred && cluster.events.length === 1 && (
          <span
            className="absolute -right-0.5 -top-0.5 size-2 rounded-full border border-paper bg-amber"
            title={copy.eventInferredExplainer}
          />
        )}
      </button>

      {!prefersTouchUi && active && (
        <EventHoverCard cluster={cluster} eventLabel={eventLabel} time={time} />
      )}
    </div>
  );
}

function EventHoverCard({
  cluster,
  eventLabel,
  time,
}: {
  cluster: EventCluster;
  eventLabel: string;
  time: string;
}) {
  const anyInferred = cluster.events.some((e) => e.timeInferred);
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 flex w-[min(240px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col gap-1.5 rounded-lg border border-rule bg-paper px-3 py-2.5 shadow-[0_4px_12px_-2px_rgba(10,31,46,0.10)]"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className="font-sans text-[10px] font-semibold uppercase text-ink-dim"
          style={{ letterSpacing: "0.16em" }}
        >
          {eventLabel}
        </span>
        <span className="font-mono text-[11px] font-medium tabular-nums text-ink-dim">
          {time}
        </span>
      </div>
      {anyInferred && (
        <p className="font-sans text-[10px] leading-snug text-amber">
          {copy.eventInferredExplainer}
        </p>
      )}
      <EventShipList events={cluster.events} compact />
    </div>
  );
}

function EventSheetBody({
  cluster,
  onClose,
}: {
  cluster: EventCluster;
  onClose: () => void;
}) {
  const isArrival = cluster.type === "arrival";
  const eventLabel = isArrival ? copy.arrivalLabel : copy.departureLabel;
  const time = formatSlotTime(cluster.events[0]!.datetime);
  const anyInferred = cluster.events.some((e) => e.timeInferred);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className="font-sans text-[10px] font-semibold uppercase text-ink-dim"
            style={{ letterSpacing: "0.16em" }}
          >
            {eventLabel}
          </div>
          <div
            className="font-display text-[22px] font-semibold tabular-nums text-ink"
            style={{ letterSpacing: "-0.4px" }}
          >
            {time}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full border border-rule bg-paper px-3 py-1.5 font-sans text-[12px] font-medium text-ink-dim hover:border-coral hover:text-coral"
        >
          {copy.closeDetail}
        </button>
      </div>
      {anyInferred && (
        <p
          className="rounded-md px-2.5 py-2 font-sans text-[12px] leading-snug text-amber"
          style={{ backgroundColor: "#FBF1DC" }}
        >
          {copy.eventInferredExplainer}
        </p>
      )}
      <EventShipList events={cluster.events} />
    </div>
  );
}

function EventShipList({
  events,
  compact = false,
}: {
  events: ShipEvent[];
  compact?: boolean;
}) {
  const totalPax = events.reduce((s, e) => s + (e.ship.passengers || 0), 0);
  const textMain = compact ? "text-[12px]" : "text-[13px]";
  const textSub = compact ? "text-[10px]" : "text-[11px]";

  return (
    <>
      <div className="flex flex-col gap-2">
        {events.map((e) => (
          <div
            key={`${e.ship.id}-${e.type}-${e.datetime}`}
            className="flex flex-col border-b border-rule pb-2 last:border-0 last:pb-0"
          >
            <span className={`font-sans font-semibold leading-tight text-ink ${textMain}`}>
              {e.ship.ship_name}
              {e.timeInferred ? (
                <span className="ml-1.5 font-normal text-amber">
                  ({copy.eventInferredHint})
                </span>
              ) : null}
            </span>
            <span className={`font-mono text-ink-mute ${textSub}`}>
              {e.ship.cruise_line} ·{" "}
              <span className="tabular-nums">
                {formatPassengers(e.ship.passengers)}
              </span>{" "}
              {copy.passengersLabel}
            </span>
          </div>
        ))}
      </div>
      {events.length > 1 && (
        <div className="flex items-baseline justify-between border-t border-rule pt-2">
          <span
            className="font-sans text-[10px] font-semibold uppercase text-ink-dim"
            style={{ letterSpacing: "0.16em" }}
          >
            ukupno
          </span>
          <span className="font-display text-[14px] font-semibold tabular-nums text-ink">
            {formatPassengers(totalPax)} {copy.passengersLabel}
          </span>
        </div>
      )}
    </>
  );
}

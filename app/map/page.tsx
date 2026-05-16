"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { CruisesFile, ForecastFile, ZonesFile } from "@/lib/forecast";
import {
  buildShipEvents,
  fetchCruises,
  fetchForecast,
  fetchZones,
  findDefaultDisplaySlot,
} from "@/lib/forecast";
import { MapHeader } from "@/components/map/MapHeader";
import {
  mobileTimelineSlotCap,
  TimeSlider,
} from "@/components/map/TimeSlider";
import { map as copy } from "@/lib/copy";
import { useIsMobileLayout } from "@/hooks/useMediaQuery";

/**
 * Leaflet relies on `window`/`document`, so the map view is loaded only on the
 * client. Next's `dynamic` with `ssr: false` is the standard way to do this.
 */
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[200px] w-full bg-paper" aria-hidden />
  ),
});

export default function MapPage() {
  const isMobileLayout = useIsMobileLayout();
  const [forecast, setForecast] = useState<ForecastFile | null>(null);
  const [zones, setZones] = useState<ZonesFile | null>(null);
  const [cruises, setCruises] = useState<CruisesFile | null>(null);
  const [slotIndex, setSlotIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const maxTimelineIndex = useMemo(() => {
    if (!forecast) return 0;
    const cap = isMobileLayout
      ? mobileTimelineSlotCap(forecast)
      : forecast.time_slots.length;
    return Math.max(0, cap - 1);
  }, [forecast, isMobileLayout]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchForecast(), fetchZones(), fetchCruises()])
      .then(([f, z, c]) => {
        if (cancelled) return;
        setForecast(f);
        setZones(z);
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

  const lastForecastGenAt = useRef<string | null>(null);

  useEffect(() => {
    if (!forecast) return;
    if (lastForecastGenAt.current !== forecast.generated_at) {
      lastForecastGenAt.current = forecast.generated_at;
      setSlotIndex(findDefaultDisplaySlot(forecast, maxTimelineIndex));
      return;
    }
    setSlotIndex((i) => Math.min(i, maxTimelineIndex));
  }, [forecast, maxTimelineIndex]);

  const slot = useMemo(() => {
    if (!forecast) return null;
    const idx = Math.min(Math.max(0, slotIndex), maxTimelineIndex);
    return forecast.time_slots[idx] ?? null;
  }, [forecast, slotIndex, maxTimelineIndex]);

  const shipEvents = useMemo(
    () => (forecast && cruises ? buildShipEvents(forecast, cruises) : []),
    [forecast, cruises],
  );

  if (error) {
    return (
      <main className="flex flex-1 items-center justify-center px-5">
        <div className="text-center">
          <div
            className="mb-2 font-sans text-[11px] font-semibold uppercase text-ink-dim"
            style={{ letterSpacing: "0.18em" }}
          >
            {copy.errorPrefix}
          </div>
          <div className="font-mono text-[13px] text-ink">{error}</div>
        </div>
      </main>
    );
  }

  if (!forecast || !zones || !slot) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <span className="font-sans text-[13px] font-medium text-ink-dim">
          {copy.loading}
        </span>
      </main>
    );
  }

  return (
    <main className="flex max-md:min-h-[calc(100dvh-3.5rem)] min-h-0 flex-1 flex-col overflow-hidden bg-cream">
      <MapHeader slot={slot} />
      {/*
        Leaflet needs a box with real px height. flex-1 + h-full alone often
        resolves to 0. Absolute fill inside flex-1 is the reliable pattern.
      */}
      <div className="relative min-h-[200px] flex-1 overflow-hidden">
        <div className="absolute inset-0 min-h-[200px]">
          <MapView zones={zones} slot={slot} />
        </div>
      </div>
      <TimeSlider
        forecast={forecast}
        slotIndex={slotIndex}
        onSlotChange={setSlotIndex}
        events={shipEvents}
        maxSlotIndex={maxTimelineIndex}
      />
    </main>
  );
}

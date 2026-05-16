"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ForecastSlot } from "@/lib/forecast";
import { formatSlotLabel, weatherDescriptor } from "@/lib/forecast";
import { formatPassengers } from "@/lib/format";
import { map as copy } from "@/lib/copy";

interface MapHeaderProps {
  slot: ForecastSlot;
}

export function MapHeader({ slot }: MapHeaderProps) {
  const weather = weatherDescriptor(slot.weather_bucket);
  const shipsCount = slot.ships_in_port.length;

  return (
    <div className="flex flex-col gap-2 border-b border-rule bg-paper px-5 py-4">
      <Link href="/" className="inline-flex items-center gap-1.5 text-ink-dim mb-1">
        <ArrowLeft size={15} strokeWidth={2} />
        <span className="font-sans text-[13px] font-medium">Natrag</span>
      </Link>
      <div className="flex items-center gap-2">
        <span className="w-[6px] h-[6px] rounded-full bg-coral shrink-0" />
        <span
          className="font-sans text-[11px] font-semibold uppercase text-ink-dim"
          style={{ letterSpacing: "0.18em" }}
        >
          {formatSlotLabel(slot.datetime)}
        </span>
      </div>

      <div className="flex items-end gap-3 sm:gap-4">
        <div className="flex min-w-0 items-baseline gap-2">
          <span
            className="font-display text-[40px] sm:text-[52px] font-bold leading-none text-ink tabular-nums"
            style={{ letterSpacing: "-1.2px" }}
          >
            {formatPassengers(slot.ashore_count)}
          </span>
          <span className="max-w-[5.5rem] font-sans text-[12px] font-medium leading-snug text-ink-dim sm:max-w-none sm:text-[13px]">
            {copy.ashoreSuffix}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-ink-dim sm:text-[12px]">
        <span>
          {shipsCount > 0 ? copy.shipsInPort(shipsCount) : copy.noShips}
        </span>
        <span className="text-rule">·</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-base leading-none">{weather.hint}</span>
          {weather.label}
        </span>
        {slot.weather && (
          <>
            <span className="text-rule">·</span>
            <span className="tabular-nums">
              {Math.round(slot.weather.temp_c)}°C
            </span>
          </>
        )}
      </div>
    </div>
  );
}

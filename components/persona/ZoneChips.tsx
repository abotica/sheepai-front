"use client";

import type { Zone } from "@/lib/forecast";
import type { PersonaVariant } from "./PersonaHero";

interface ZoneChipsProps {
  zones: Zone[];
  /** null = "all zones" sentinel */
  value: string | null;
  onChange: (next: string | null) => void;
  variant: PersonaVariant;
  allLabel: string;
}

const VARIANT = {
  crowds: {
    activeBorder: "border-amber",
    activeText: "text-amber",
    activeBg: "bg-paper",
    activeShadow: "shadow-[0_4px_14px_-8px_#D88A0E80]",
  },
  calm: {
    activeBorder: "border-teal",
    activeText: "text-teal",
    activeBg: "bg-paper",
    activeShadow: "shadow-[0_4px_14px_-8px_#2E7E8080]",
  },
} satisfies Record<
  PersonaVariant,
  {
    activeBorder: string;
    activeText: string;
    activeBg: string;
    activeShadow: string;
  }
>;

export function ZoneChips({
  zones,
  value,
  onChange,
  variant,
  allLabel,
}: ZoneChipsProps) {
  const v = VARIANT[variant];

  return (
    <div className="px-5">
      <div
        role="tablist"
        aria-label="Filter zona"
        className="flex gap-2 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <Chip
          label={allLabel}
          active={value === null}
          variant={v}
          onClick={() => onChange(null)}
        />
        {zones.map((zone) => (
          <Chip
            key={zone.id}
            label={zone.name_hr}
            active={value === zone.id}
            variant={v}
            onClick={() => onChange(zone.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  variant: (typeof VARIANT)[PersonaVariant];
  onClick: () => void;
}

function Chip({ label, active, variant, onClick }: ChipProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`shrink-0 inline-flex h-9 items-center rounded-full border px-4 font-sans text-[13px] font-medium whitespace-nowrap transition-all duration-150 ${
        active
          ? `${variant.activeBorder} ${variant.activeText} ${variant.activeBg} ${variant.activeShadow}`
          : "border-rule bg-paper text-ink-dim hover:text-ink hover:border-ink-dim"
      }`}
    >
      {label}
    </button>
  );
}

"use client";

import type { PersonaVariant } from "./PersonaHero";

export type DayOffset = 0 | 1;

interface DayToggleProps {
  value: DayOffset;
  onChange: (next: DayOffset) => void;
  variant: PersonaVariant;
  labels: { today: string; tomorrow: string };
}

const VARIANT = {
  crowds: {
    activeBorder: "border-amber",
    activeText: "text-amber",
    activeShadow: "shadow-[0_4px_14px_-8px_#D88A0E80]",
  },
  calm: {
    activeBorder: "border-teal",
    activeText: "text-teal",
    activeShadow: "shadow-[0_4px_14px_-8px_#2E7E8080]",
  },
} satisfies Record<
  PersonaVariant,
  { activeBorder: string; activeText: string; activeShadow: string }
>;

/**
 * Two-pill segmented control for switching the persona page between today
 * and tomorrow. Sits between hero and zone chips. Inactive pills are
 * subdued so the active pill carries the persona accent without competing
 * with the hero number.
 */
export function DayToggle({ value, onChange, variant, labels }: DayToggleProps) {
  const v = VARIANT[variant];

  return (
    <div className="px-5 pt-1 pb-3">
      <div
        role="tablist"
        aria-label="Vremenski horizont"
        className="inline-flex items-center gap-1 rounded-full border border-rule bg-paper p-1"
      >
        {(
          [
            { offset: 0, label: labels.today },
            { offset: 1, label: labels.tomorrow },
          ] as const
        ).map(({ offset, label }) => {
          const active = value === offset;
          return (
            <button
              key={offset}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(offset)}
              className={`h-8 rounded-full px-4 font-sans text-[12px] font-semibold uppercase whitespace-nowrap transition-all duration-150 ${
                active
                  ? `bg-cream border ${v.activeBorder} ${v.activeText} ${v.activeShadow}`
                  : "border border-transparent text-ink-dim hover:text-ink"
              }`}
              style={{ letterSpacing: "0.16em" }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

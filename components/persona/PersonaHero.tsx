import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export type PersonaVariant = "crowds" | "calm";

interface PersonaHeroProps {
  variant: PersonaVariant;
  eyebrow: string;
  bigNumber: string;
  bigSuffix: string;
  contextLine: string;
  /** Optional second line, e.g. "2 zone crveno · oprez!" */
  warningLine?: string | null;
}

const VARIANT = {
  crowds: {
    dot: "bg-amber",
    accent: "text-amber",
  },
  calm: {
    dot: "bg-teal",
    accent: "text-teal",
  },
} satisfies Record<PersonaVariant, { dot: string; accent: string }>;

export function PersonaHero({
  variant,
  eyebrow,
  bigNumber,
  bigSuffix,
  contextLine,
  warningLine,
}: PersonaHeroProps) {
  const v = VARIANT[variant];

  return (
    <header className="px-5 pt-6 pb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-[6px] h-[6px] rounded-full ${v.dot} shrink-0`} />
          <p
            className="font-sans text-[11px] font-semibold uppercase text-ink-dim"
            style={{ letterSpacing: "0.22em" }}
          >
            {eyebrow}
          </p>
        </div>
        <Link
          href="/"
          aria-label="Natrag"
          className="inline-flex items-center gap-1 font-sans text-[11px] font-medium uppercase text-ink-dim hover:text-ink transition-colors duration-150"
          style={{ letterSpacing: "0.16em" }}
        >
          <ArrowLeft size={12} strokeWidth={2} />
          Natrag
        </Link>
      </div>

      <h1
        className="font-display leading-[0.95] mb-4"
        style={{ letterSpacing: "-1.2px" }}
      >
        <span className="text-[52px] sm:text-[60px] font-bold text-ink tabular-nums">
          {bigNumber}
        </span>
        <span className="text-[28px] sm:text-[34px] font-normal italic text-ink-dim">
          {" "}
          {bigSuffix}
        </span>
      </h1>

      <div className="flex flex-col gap-1">
        <p className="font-mono text-[12px] text-ink-dim">{contextLine}</p>
        {warningLine && (
          <p className={`font-sans text-[13px] font-medium ${v.accent}`}>
            {warningLine}
          </p>
        )}
      </div>
    </header>
  );
}

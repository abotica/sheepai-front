import { Video } from "lucide-react";
import { home } from "@/lib/copy";
import { AnimatedCount } from "@/components/AnimatedCount";

interface HomeHeaderProps {
  passengerCount: number;
  shipCount: number;
  timeStart: string | null;
  timeEnd: string | null;
}

export function HomeHeader({
  passengerCount,
  shipCount,
  timeStart,
  timeEnd,
}: HomeHeaderProps) {
  return (
    <header className="px-5 pt-8 pb-6">
      <div className="flex items-center gap-2 mb-3">
        <p
          className="font-sans text-[11px] font-medium text-ink-dim uppercase"
          style={{ letterSpacing: "0.22em" }}
        >
          {home.dateLabel()}
        </p>
        <span className="text-ink-dim text-[16px] leading-none">·</span>
        <a
          href="https://m.hak.hr/kamera.asp?g=5&k=31"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center"
          aria-label="Live kamera luke"
        >
          <Video size={12} color="#D9614B" strokeWidth={2} />
        </a>
      </div>

      <h1
        className="font-display leading-[0.95] mb-5"
        style={{ letterSpacing: "-1.5px" }}
      >
        <span className="text-[60px] font-bold text-ink tabular-nums">
          <AnimatedCount target={passengerCount} />
        </span>
        <span className="text-[60px] font-normal italic text-ink-dim">
          {" "}{home.passengerSuffix}
        </span>
      </h1>

      <div className="flex items-center gap-3">
        <span
          className="font-mono text-[12px] text-ink-dim uppercase"
          style={{ letterSpacing: "0.1em" }}
        >
          {shipCount} kruzera
        </span>
        <span className="text-rule text-[16px] leading-none">·</span>
        {timeStart && timeEnd && (
          <span className="font-mono text-[12px] text-ink-dim">
            {timeStart} — {timeEnd}
          </span>
        )}
      </div>
    </header>
  );
}

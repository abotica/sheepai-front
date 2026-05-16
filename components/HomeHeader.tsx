import { home } from "@/lib/copy";
import { formatPassengers } from "@/lib/format";

interface HomeHeaderProps {
  city: string;
  passengerCount: number;
  shipCount: number;
  timeStart: string;
  timeEnd: string;
}

export function HomeHeader({
  city,
  passengerCount,
  shipCount,
  timeStart,
  timeEnd,
}: HomeHeaderProps) {
  return (
    <header className="px-5 pt-8 pb-6">
      <p className="font-sans text-[11px] font-medium text-ink-secondary uppercase tracking-widest mb-3">
        {home.dateLabel(city)}
      </p>
      <h1 className="font-display font-bold leading-none mb-2">
        <span className="text-[56px] tabular-nums text-ink">
          {formatPassengers(passengerCount)}
        </span>
        <span className="text-[56px] font-normal text-ink"> {home.passengerSuffix}</span>
      </h1>
      <p className="font-display text-[15px] text-ink-secondary">
        {home.shipsInPort(shipCount, timeStart, timeEnd)}
      </p>
    </header>
  );
}

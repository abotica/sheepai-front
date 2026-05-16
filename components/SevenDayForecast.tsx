import { forecast } from "@/lib/copy"
import { formatK, formatPassengers } from "@/lib/format"

interface DayData {
  day: (typeof forecast.days)[number]
  load: number | null
  isToday?: boolean
}

const data: DayData[] = [
  { day: "PON", load: 1800 },
  { day: "UTO", load: 3900, isToday: true },
  { day: "SRI", load: 2200 },
  { day: "ČET", load: null },
  { day: "PET", load: 6000 },
  { day: "SUB", load: 4100 },
  { day: "NED", load: 1500 },
]

const MAX_BAR_H = 52
const maxLoad = Math.max(...data.map(d => d.load ?? 0))

function barHeight(load: number | null): number {
  if (!load) return 3
  return Math.max(4, Math.round((load / maxLoad) * MAX_BAR_H))
}

function barColor(load: number | null): string {
  if (!load) return "#A1A1AA"
  if (load < 2500) return "#CA8A04"
  if (load < 5000) return "#EA580C"
  return "#DC2626"
}

export default function SevenDayForecast() {
  const total = data.reduce((sum, d) => sum + (d.load ?? 0), 0)

  return (
    <div className="px-5 mt-8">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display font-semibold text-[18px] text-ink">
          {forecast.heading}
        </h2>
        <span className="font-mono text-[11px] font-medium text-ink-tertiary tabular-nums uppercase tracking-wide">
          uk. {formatPassengers(total)} pax
        </span>
      </div>

      <div className="flex gap-1.5">
        {data.map(({ day, load, isToday }) => (
          <div
            key={day}
            className="flex-1 flex flex-col items-center rounded-2xl border py-3 gap-2"
            style={{
              backgroundColor: "#FAFAFA",
              borderColor: isToday ? "#CA8A04" : "#E4E4E7",
              borderWidth: isToday ? 1.5 : 1,
            }}
          >
            <span className="font-sans text-[10px] font-semibold text-ink-secondary uppercase tracking-wide">
              {day}
            </span>

            <div
              className="flex items-end justify-center"
              style={{ height: MAX_BAR_H }}
            >
              <div
                className="w-2.5 rounded-t-sm"
                style={{
                  height: barHeight(load),
                  backgroundColor: barColor(load),
                }}
              />
            </div>

            <span className="font-mono text-[11px] font-medium text-ink tabular-nums">
              {load !== null ? formatK(load) : "–"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

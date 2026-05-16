import { forecast } from "@/lib/copy"
import { formatK, formatPassengers } from "@/lib/format"
import Link from "next/link"

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

const BAR_TRACK = 48
const maxLoad = Math.max(...data.map(d => d.load ?? 0))

function barHeight(load: number | null): number {
  if (!load) return 2
  return Math.max(3, Math.round((load / maxLoad) * BAR_TRACK))
}

export default function SevenDayForecast() {
  const total = data.reduce((sum, d) => sum + (d.load ?? 0), 0)

  return (
    <div className="px-5 mt-8">
      <div className="flex items-baseline justify-between mb-4">
        <h2
          className="font-display font-semibold text-[22px] text-ink"
          style={{ letterSpacing: "-0.5px" }}
        >
          {forecast.heading}
        </h2>
        <span
          className="font-mono text-[10px] font-medium text-ink-dim uppercase tabular-nums"
          style={{ letterSpacing: "0.15em" }}
        >
          <Link href={"/calendar"}>Pogledaj sve datume</Link>
        </span>
      </div>

      <div className="flex gap-1.5">
        {data.map(({ day, load, isToday }) => (
          <div
            key={day}
            className="flex-1 flex flex-col items-center rounded-2xl border py-3 gap-2"
            style={
              isToday
                ? {
                    backgroundColor: "#FFFFFF",
                    borderColor: "#D88A0E",
                    boxShadow: "0 6px 18px -10px #D88A0E80",
                  }
                : {
                    backgroundColor: "#FBF8F2",
                    borderColor: "#E8E0D2",
                  }
            }
          >
            <span
              className="font-sans text-[9px] font-semibold uppercase"
              style={{
                letterSpacing: "0.12em",
                color: isToday ? "#D88A0E" : "#5A6B78",
              }}
            >
              {day}
            </span>

            <div
              className="flex items-end justify-center"
              style={{ height: BAR_TRACK }}
            >
              {load !== null ? (
                <div
                  style={{
                    width: 8,
                    height: barHeight(load),
                    backgroundColor: "#D88A0E",
                    borderRadius: "2px 2px 0 0",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 8,
                    height: 2,
                    backgroundColor: "#E8E0D2",
                    borderRadius: 1,
                  }}
                />
              )}
            </div>

            <span className="font-mono text-[10px] font-semibold text-ink tabular-nums">
              {load !== null ? formatK(load) : "–"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

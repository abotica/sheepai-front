import { Ship, House } from "lucide-react"
import AddToCalendarButton from "@/components/AddToCalendarButton"
import ClickCard from "@/components/ClickCard"
import { CrowdChart } from "@/components/CrowdChart"
import { HomeHeader } from "@/components/HomeHeader"
import SevenDayForecast from "@/components/SevenDayForecast"
import { personas } from "@/lib/copy"
import cruisesData from "@/data/cruises.json"
import forecastData from "@/data/forecast.json"
import type { HourlyLoad } from "@/components/CrowdChart"
import type { DayData } from "@/components/SevenDayForecast"
import { forecast as forecastCopy } from "@/lib/copy"

const today = new Date().toISOString().slice(0, 10)
const todayShips = cruisesData.ships.filter(s => s.date === today)

// Build hourly ashore_count peaks for today from 30-min forecast slots
const hourMap = new Map<number, number>()
for (const slot of forecastData.time_slots) {
  if (slot.datetime.slice(0, 10) !== today) continue
  const hour = parseInt(slot.datetime.slice(11, 13), 10)
  hourMap.set(hour, Math.max(hourMap.get(hour) ?? 0, slot.ashore_count))
}
const crowdData: HourlyLoad[] = [...hourMap.entries()]
  .sort(([a], [b]) => a - b)
  .filter(([, load]) => load > 0)
  .map(([hour, load]) => ({ hour: String(hour), load }))
const passengerCount = todayShips.reduce((sum, s) => sum + s.passengers, 0)
const shipCount = todayShips.length

const arrivals = todayShips.map(s => s.arrival_time).filter(Boolean) as string[]
const departures = todayShips.map(s => s.departure_time).filter(Boolean) as string[]
const timeStart = arrivals.length ? arrivals.sort()[0] : null
const timeEnd = departures.length ? departures.sort().at(-1)! : null

// Build 7-day peak ashore_count per date from forecast
const DAY_ABBR: DayData['day'][] = ['PON', 'UTO', 'SRI', 'ČET', 'PET', 'SUB', 'NED']
const dayPeakMap = new Map<string, number>()
for (const slot of forecastData.time_slots) {
  const date = slot.datetime.slice(0, 10)
  dayPeakMap.set(date, Math.max(dayPeakMap.get(date) ?? 0, slot.ashore_count))
}
const weekData: DayData[] = [...dayPeakMap.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([date, load]) => {
    const jsDay = new Date(date).getDay()
    const day = DAY_ABBR[jsDay === 0 ? 6 : jsDay - 1]
    return { date, day, load: load > 0 ? load : null, isToday: date === today }
  })

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-surface font-sans">
      <main className="flex flex-col flex-1 w-full">
        <HomeHeader
          city="Split"
          passengerCount={passengerCount}
          shipCount={shipCount}
          timeStart={timeStart}
          timeEnd={timeEnd}
        />
        <CrowdChart data={crowdData} />
        <div className="grid grid-cols-2 gap-3 px-5 mt-6">
          <ClickCard
            title={personas.business.title}
            subtitle={personas.business.subtitle}
            href={personas.business.href}
            icon={Ship}
            accentColor="#D88A0E"
          />
          <ClickCard
            title={personas.local.title}
            subtitle={personas.local.subtitle}
            href={personas.local.href}
            icon={House}
            accentColor="#2E7E80"
          />
        </div>
        <SevenDayForecast data={weekData} />
        <AddToCalendarButton />
        <footer className="px-5 mt-8 mb-4 text-center text-ink-tertiary font-sans text-[13px]">
          Demo · Hackathon Split 2026
        </footer>
      </main>
    </div>
  )
}

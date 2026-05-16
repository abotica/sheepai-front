import { Ship, House } from "lucide-react"
import AddToCalendarButton from "@/components/AddToCalendarButton"
import ClickCard from "@/components/ClickCard"
import { CrowdChart } from "@/components/CrowdChart"
import { HomeHeader } from "@/components/HomeHeader"
import SevenDayForecast from "@/components/SevenDayForecast"
import { personas } from "@/lib/copy"

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-surface font-sans">
      <main className="flex flex-col flex-1 w-full">
        <HomeHeader
          city="Split"
          passengerCount={7000}
          shipCount={3}
          timeStart="07:00"
          timeEnd="17:00"
        />
        <CrowdChart />
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
        <SevenDayForecast />
        <AddToCalendarButton />
        <footer className="px-5 mt-8 mb-4 text-center text-ink-tertiary font-sans text-[13px]">
          Demo · Hackathon Split 2026
        </footer>
      </main>
    </div>
  )
}

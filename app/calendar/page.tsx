'use client'

import { useState } from 'react'
import { Ship as ShipIcon, Users, Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import cruisesData from '@/data/cruises.json'
import { formatPassengers } from '@/lib/format'

type Cruise = typeof cruisesData.ships[number]

const MONTHS_HR = [
  'Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj',
  'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac',
]
const DAYS_HR = ['PON', 'UTO', 'SRI', 'ČET', 'PET', 'SUB', 'NED']

const byDate = new Map<string, Cruise[]>()
for (const ship of cruisesData.ships) {
  const existing = byDate.get(ship.date) ?? []
  existing.push(ship)
  byDate.set(ship.date, existing)
}

const months = [...new Set(cruisesData.ships.map(s => s.date.slice(0, 7)))].sort()

function toCroatianWeekday(jsDay: number) {
  return jsDay === 0 ? 6 : jsDay - 1
}

function monthShipCount(monthKey: string) {
  return [...byDate.entries()]
    .filter(([d]) => d.startsWith(monthKey))
    .reduce((acc, [, ships]) => acc + ships.length, 0)
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <main className="flex-1 pb-12">
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-baseline justify-between">
          <h1
            className="font-sans font-bold text-[28px] text-ink"
            style={{ letterSpacing: '-0.5px' }}
          >
            Raspored {cruisesData.year}
          </h1>
          <Link href="/" className="inline-flex items-center gap-1.5 text-ink-dim">
            <ArrowLeft size={15} strokeWidth={2} />
            <span className="font-sans text-[13px] font-medium">Natrag</span>
          </Link>
        </div>
      </div>

      <div className="px-5 space-y-10">
        {months.map(monthKey => {
          const [yearStr, monthStr] = monthKey.split('-')
          const year = parseInt(yearStr)
          const month = parseInt(monthStr)
          const daysInMonth = new Date(year, month, 0).getDate()
          const firstJsDay = new Date(year, month - 1, 1).getDay()
          const startOffset = toCroatianWeekday(firstJsDay)
          const monthName = MONTHS_HR[month - 1]
          const shipCount = monthShipCount(monthKey)

          return (
            <div key={monthKey} className="rounded-3xl border border-rule bg-paper p-5" style={{ boxShadow: '0 8px 24px -16px rgba(10,31,46,0.10)' }}>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-sans font-semibold text-[18px] text-ink">
                  {monthName}
                </h2>
                <span
                  className="font-mono text-[10px] text-ink-dim uppercase"
                  style={{ letterSpacing: '0.12em' }}
                >
                  {shipCount} {shipCount === 1 ? 'kruzer' : 'kruzera'}
                </span>
              </div>

              <div className="grid grid-cols-7 mb-1">
                {DAYS_HR.map(d => (
                  <div
                    key={d}
                    className="text-center font-mono text-[9px] font-semibold text-ink-dim uppercase py-1"
                    style={{ letterSpacing: '0.08em' }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`gap-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateStr = `${yearStr}-${monthStr}-${String(day).padStart(2, '0')}`
                  const ships = byDate.get(dateStr)
                  const isToday = dateStr === today
                  const isSelected = selectedDate === dateStr
                  const hasShips = !!ships?.length

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      className="flex flex-col items-center justify-start py-1.5 gap-1 rounded-xl"
                      style={{
                        backgroundColor: isSelected
                          ? '#0A1F2E'
                          : isToday
                          ? 'rgba(10,31,46,0.07)'
                          : 'transparent',
                      }}
                    >
                      <span
                        className="font-mono text-[13px] font-semibold tabular-nums leading-none"
                        style={{
                          color: isSelected
                            ? '#EEF3F8'
                            : hasShips
                            ? '#0A1F2E'
                            : '#B8C8D4',
                        }}
                      >
                        {day}
                      </span>
                      {hasShips ? (
                        <span
                          className="w-[5px] h-[5px] rounded-full"
                          style={{
                            backgroundColor: isSelected ? '#93AAC0' : '#4A8FA6',
                          }}
                        />
                      ) : (
                        <span className="w-[5px] h-[5px]" />
                      )}
                    </button>
                  )
                })}
              </div>

              {selectedDate?.startsWith(monthKey) && byDate.has(selectedDate) && (
                <div className="mt-4 rounded-2xl border border-rule bg-paper p-4 space-y-4">
                  {byDate.get(selectedDate)!.map((ship, idx, arr) => (
                    <div key={ship.id}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <ShipIcon size={13} color="#4A8FA6" strokeWidth={1.75} />
                        <span className="font-sans text-[13px] font-semibold text-ink">
                          {ship.ship_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 pl-5">
                        <div className="flex items-center gap-1">
                          <Users size={10} color="#5A6B7E" strokeWidth={1.75} />
                          <span className="font-mono text-[11px] text-ink-dim tabular-nums">
                            {formatPassengers(ship.passengers)} pax
                          </span>
                        </div>
                        {ship.arrival_time && (
                          <div className="flex items-center gap-1">
                            <Clock size={10} color="#5A6B7E" strokeWidth={1.75} />
                            <span className="font-mono text-[11px] text-ink-dim">
                              {ship.arrival_time} — {ship.departure_time}
                            </span>
                          </div>
                        )}
                      </div>
                      {idx < arr.length - 1 && <div className="mt-3 h-px bg-rule" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}

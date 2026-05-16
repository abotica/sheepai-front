'use client'

import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { BarChart, Bar, XAxis, ResponsiveContainer, ReferenceLine } from 'recharts'
import { crowdLevel } from '@/lib/copy'

export type HourlyLoad = { hour: string; load: number }

interface CrowdChartProps {
  data: HourlyLoad[]
}


type ShapeProps = {
  x?: number
  y?: number
  width?: number
  height?: number
  index?: number
  payload?: { hour: string; load: number }
}


type BarPos = { x: number; width: number }

export function CrowdChart({ data }: CrowdChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [activeBarPos, setActiveBarPos] = useState<BarPos | null>(null)
  const [nowLabel, setNowLabel] = useState('')
  const [currentHour, setCurrentHour] = useState('')

  useEffect(() => {
    const id = setTimeout(() => {
      const d = new Date()
      setNowLabel(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      )
      setCurrentHour(String(d.getHours()))
    }, 0)
    return () => clearTimeout(id)
  }, [])

  const maxLoad = Math.max(...data.map(d => d.load), 1)
  const activeItem = activeIndex !== null ? data[activeIndex] : null

  return (
    <div className="px-5 mt-2">
      <div className="rounded-3xl border border-rule bg-paper p-5">
        <div className="flex items-center justify-between mb-4">
          <span
            className="font-sans text-[11px] font-semibold text-ink-dim uppercase"
            style={{ letterSpacing: '0.18em' }}
          >
            Gustoća po satu
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-[5px] h-[5px] rounded-full bg-coral block" />
            <span suppressHydrationWarning className="font-mono text-[11px] text-coral">
              {nowLabel} sada
            </span>
          </div>
        </div>

        {/* Explicit height + minWidth so ResponsiveContainer never measures -1×-1 (SSR/hydration). */}
        <div className="relative h-40 w-full min-w-0 overflow-hidden">
          {activeItem && activeBarPos && (
            <div
              className="absolute top-0 z-10 pointer-events-none"
              style={{
                left: `clamp(75px, ${activeBarPos.x + activeBarPos.width / 2}px, calc(100% - 75px))`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="flex items-center gap-1 whitespace-nowrap">
                <Users size={11} color="#1E88E5" />
                <span className="font-sans text-[11px] font-semibold text-ink">{activeItem.hour}h:</span>
                <span className="font-sans text-[11px] text-ink-dim">{crowdLevel(activeItem.load)}</span>
              </div>
            </div>
          )}
          <ResponsiveContainer width="100%" height={160} minWidth={0}>
            <BarChart
              data={data}
              barCategoryGap={5}
              margin={{ top: 24, right: 0, bottom: 0, left: 0 }}
            >
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#5A6B78', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                interval={2}
              />
              <ReferenceLine y={maxLoad * 0.5} stroke="#E8E0D2" strokeWidth={1} />
              <Bar
                dataKey="load"
                shape={(props: ShapeProps) => {
                  const { x = 0, y = 0, width = 0, height = 0, payload, index = 0 } = props
                  if (!payload || width <= 0 || height <= 0) return <g />

                  const isCurrent = payload.hour === currentHour
                  const isActive = index === activeIndex
                  const fill = isCurrent ? '#D9614B' : '#7E9AA8'
                  const r = 3
                  const d =
                    `M ${x + r},${y} ` +
                    `L ${x + width - r},${y} ` +
                    `Q ${x + width},${y} ${x + width},${y + r} ` +
                    `L ${x + width},${y + height} ` +
                    `L ${x},${y + height} ` +
                    `L ${x},${y + r} ` +
                    `Q ${x},${y} ${x + r},${y} Z`

                  return (
                    <path
                      d={d}
                      fill={fill}
                      opacity={isActive ? 1 : isCurrent ? 1 : 0.85}
                      onClick={() => {
                        const next = activeIndex === index ? null : index
                        setActiveIndex(next)
                        setActiveBarPos(next !== null ? { x, width } : null)
                      }}
                      style={{ cursor: 'pointer', outline: 'none' }}
                    />
                  )
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

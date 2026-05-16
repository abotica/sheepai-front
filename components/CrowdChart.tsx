'use client'

import { useState, useRef } from 'react'
import { Users } from 'lucide-react'
import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts'
import { crowdLevel } from '@/lib/copy'

const data = [
  { hour: '6', load: 200 },
  { hour: '7', load: 450 },
  { hour: '8', load: 1200 },
  { hour: '9', load: 2800 },
  { hour: '10', load: 4500 },
  { hour: '11', load: 5200 },
  { hour: '12', load: 4800 },
  { hour: '13', load: 3900 },
  { hour: '14', load: 2400 },
  { hour: '15', load: 1800 },
  { hour: '16', load: 3200 },
  { hour: '17', load: 2100 },
  { hour: '18', load: 900 },
  { hour: '19', load: 400 },
]

const maxLoad = Math.max(...data.map(d => d.load))

function formatHour(hour: string): string {
  return `${parseInt(hour, 10)}:00`
}

type ShapeProps = {
  x?: number
  y?: number
  width?: number
  height?: number
  index?: number
  payload?: { hour: string; load: number }
}

type BarPos = { x: number; width: number; containerWidth: number }

// Estimated half-width of the tooltip label in px — used to clamp against edges.
const TOOLTIP_HALF_W = 72

export function CrowdChart() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [activeBarPos, setActiveBarPos] = useState<BarPos | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeItem = activeIndex !== null ? data[activeIndex] : null

  const tooltipLeft = activeBarPos
    ? Math.max(
        TOOLTIP_HALF_W,
        Math.min(
          activeBarPos.containerWidth - TOOLTIP_HALF_W,
          activeBarPos.x + activeBarPos.width / 2,
        ),
      )
    : 0

  return (
    <div className="w-full px-5">
      <div ref={containerRef} className="relative overflow-visible" style={{ height: 200 }}>
        {activeItem && activeBarPos && (
          <div
            className="absolute top-0 z-10 pointer-events-none"
            style={{ left: tooltipLeft, transform: 'translateX(-50%)' }}
          >
            <div className="flex items-center gap-1 whitespace-nowrap">
              <Users size={12} className="text-brand" />
              <span className="font-sans text-[11px] font-semibold text-ink">
                {formatHour(activeItem.hour)}:
              </span>
              <span className="font-sans text-[11px] text-ink-secondary">
                {crowdLevel(activeItem.load)}
              </span>
            </div>
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart
            data={data}
            barCategoryGap={4}
            margin={{ top: 28, right: 0, bottom: 0, left: 0 }}
          >
            <XAxis
              dataKey="hour"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'var(--font-inter)' }}
              interval={2}
            />
            <Bar
              dataKey="load"
              shape={(props: ShapeProps) => {
                const { x = 0, y = 0, width = 0, height = 0, payload, index = 0 } = props
                if (!payload || width <= 0 || height <= 0) return <g />

                const isMax = payload.load === maxLoad
                const isActive = index === activeIndex
                const fill = isMax ? '#DC2626' : '#0F4C75'
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
                    opacity={isActive ? 1 : 0.65}
                    onClick={() => {
                      const next = activeIndex === index ? null : index
                      setActiveIndex(next)
                      const containerWidth = containerRef.current?.offsetWidth ?? 0
                      setActiveBarPos(next !== null ? { x, width, containerWidth } : null)
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
  )
}

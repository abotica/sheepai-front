'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import type { ForecastSlot, ZonesFile } from '@/lib/forecast'

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-paper" />,
})

interface MapPreviewProps {
  zones: ZonesFile
  slot: ForecastSlot
}

export default function MapPreview({ zones, slot }: MapPreviewProps) {
  return (
    <div className="px-5 mt-6">
      <Link
        href="/map"
        className="block relative rounded-3xl overflow-hidden border border-rule"
        style={{ height: 200 }}
      >
        {/* live map, all interactions disabled */}
        <div className="absolute inset-0 pointer-events-none">
          <MapView zones={zones} slot={slot} />
        </div>

        {/* tap target overlay with label */}
        <div className="absolute inset-0 flex items-end p-4">
          <div
            className="flex items-center gap-1.5 rounded-2xl px-3 py-1.5"
            style={{ backgroundColor: 'rgba(251,248,242,0.92)', border: '1px solid #E8E0D2' }}
          >
            <MapPin size={12} color="#D88A0E" strokeWidth={2} />
            <span className="font-sans text-[12px] font-semibold text-ink">
              Otvori kartu
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}

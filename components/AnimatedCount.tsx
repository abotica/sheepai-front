'use client'

import { useEffect, useState } from 'react'
import { formatPassengers } from '@/lib/format'

export function AnimatedCount({ target }: { target: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (target === 0) return
    const duration = 900
    const start = performance.now()

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [target])

  return <>{formatPassengers(count)}</>
}

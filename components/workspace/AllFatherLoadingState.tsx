'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const INVOCATIONS = [
  'The Allfather sees.',
  'Your Realm takes shape.',
  'The flows are written.',
]

const CYCLE_INTERVAL_MS = 3500
const FADE_DURATION_MS = 500
const COMPLEXITY_DELAY_MS = 30000

export function AllFatherLoadingState() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [showComplexity, setShowComplexity] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (reducedMotion) return

    setIsVisible(true)
    let fadeTimeout: ReturnType<typeof setTimeout>
    const interval = setInterval(() => {
      setIsVisible(false)
      fadeTimeout = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % INVOCATIONS.length)
        setIsVisible(true)
      }, FADE_DURATION_MS)
    }, CYCLE_INTERVAL_MS)

    return () => {
      clearInterval(interval)
      clearTimeout(fadeTimeout)
    }
  }, [reducedMotion])

  useEffect(() => {
    const t = setTimeout(() => setShowComplexity(true), COMPLEXITY_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      aria-label="Generating your artifacts"
      className="flex min-h-screen items-center justify-center bg-mg-background"
    >
      <div className="border border-mg-border bg-mg-surface px-7 py-6 flex flex-col items-center gap-4">
        <div
          className={cn(
            'h-[5px] w-[5px] rounded-full bg-mg-accent',
            !reducedMotion && 'animate-pulse'
          )}
        />

        <p
          className={cn(
            'font-mono text-[13px] italic text-mg-foreground-muted',
            !reducedMotion && 'transition-opacity duration-500',
            reducedMotion ? 'opacity-100' : isVisible ? 'opacity-100' : 'opacity-0'
          )}
        >
          {INVOCATIONS[currentIndex]}
        </p>

        {showComplexity && (
          <p className="font-mono text-[11px] text-mg-foreground-subtle mt-2">
            This Realm is complex. A moment more.
          </p>
        )}
      </div>
    </div>
  )
}

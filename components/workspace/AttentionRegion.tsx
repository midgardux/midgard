'use client'

import { useRef, useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type AttentionVariant = 'info' | 'warning' | 'error' | 'confirm'

interface AttentionRegionProps {
  variant: AttentionVariant
  'aria-label'?: string
  title?: string
  trapFocus?: boolean
  className?: string
  children: ReactNode
}

const borderClass: Record<AttentionVariant, string> = {
  info:    'border-mg-border',
  warning: 'border-mg-accent-muted',
  error:   'border-mg-foreground-muted',
  confirm: 'border-mg-border',
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function AttentionRegion({
  variant,
  'aria-label': ariaLabel,
  title,
  trapFocus = false,
  className = '',
  children,
}: AttentionRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLParagraphElement>(null)
  const isAlert = variant === 'error' || variant === 'warning'

  useEffect(() => {
    if (!trapFocus || !regionRef.current) return

    const previousFocus = document.activeElement as HTMLElement | null

    if (titleRef.current) {
      titleRef.current.focus()
    } else {
      const first = regionRef.current.querySelector<HTMLElement>(FOCUSABLE)
      first?.focus()
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !regionRef.current) return
      if (!regionRef.current.contains(document.activeElement)) return
      const queried = Array.from(regionRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      const focusable: HTMLElement[] = titleRef.current ? [titleRef.current, ...queried] : queried
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [trapFocus, title])

  return (
    <div
      ref={regionRef}
      role={isAlert ? 'alert' : 'region'}
      aria-label={ariaLabel}
      className={cn('border', borderClass[variant], 'bg-mg-surface py-6 px-7', className)}
    >
      {title && (
        <p
          ref={titleRef}
          tabIndex={trapFocus ? -1 : undefined}
          className={cn(
            'font-mono text-xs text-mg-foreground uppercase tracking-widest mb-3',
            trapFocus && 'focus:outline focus:outline-[1px] focus:outline-[color:var(--mg-border)] focus:outline-offset-2'
          )}
        >
          {title}
        </p>
      )}
      {children}
    </div>
  )
}

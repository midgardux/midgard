import type { ReactNode } from 'react'

type AttentionVariant = 'info' | 'warning' | 'error' | 'confirm'

interface AttentionRegionProps {
  variant: AttentionVariant
  'aria-label'?: string
  title?: string
  className?: string
  children: ReactNode
}

const borderClass: Record<AttentionVariant, string> = {
  info:    'border-mg-border',
  warning: 'border-mg-accent-muted',
  error:   'border-mg-foreground-muted',
  confirm: 'border-mg-border',
}

export function AttentionRegion({
  variant,
  'aria-label': ariaLabel,
  title,
  className = '',
  children,
}: AttentionRegionProps) {
  const isAlert = variant === 'error' || variant === 'warning'

  return (
    <div
      role={isAlert ? 'alert' : 'region'}
      aria-live={isAlert ? 'assertive' : undefined}
      aria-label={ariaLabel}
      className={`border ${borderClass[variant]} bg-mg-surface py-6 px-7 ${className}`.trim()}
    >
      {title && (
        <p className="font-mono text-xs text-mg-foreground uppercase tracking-widest mb-3">
          {title}
        </p>
      )}
      {children}
    </div>
  )
}

import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

export type MidgardButtonTier = 'primary' | 'ghost' | 'nano'

interface MidgardButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tier?: MidgardButtonTier
}

const tierClass: Record<MidgardButtonTier, string> = {
  primary:
    'bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2 hover:bg-mg-accent-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-1 focus-visible:outline-[color:var(--mg-border)] focus-visible:outline-offset-2',
  ghost:
    'border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-1 focus-visible:outline-[color:var(--mg-border)] focus-visible:outline-offset-2',
  nano:
    'font-mono text-[11px] px-2 py-1 text-mg-foreground-subtle hover:text-mg-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-1 focus-visible:outline-[color:var(--mg-border)] focus-visible:outline-offset-2',
}

export function MidgardButton({
  tier = 'ghost',
  className,
  type = 'button',
  ...props
}: MidgardButtonProps) {
  return (
    <button
      type={type}
      className={cn(tierClass[tier], className)}
      {...props}
    />
  )
}

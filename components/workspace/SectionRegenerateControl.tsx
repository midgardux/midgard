'use client'

import { cn } from '@/lib/utils'
import { MidgardButton } from '@/components/workspace/MidgardButton'

interface SectionRegenerateControlProps {
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function SectionRegenerateControl({
  onClick,
  disabled,
  className,
}: SectionRegenerateControlProps) {
  return (
    <div
      className={cn(
        'tablet:min-h-[44px] mobile:min-h-[44px] tablet:flex mobile:flex tablet:items-center mobile:items-center tablet:cursor-pointer mobile:cursor-pointer',
        className
      )}
    >
      <MidgardButton tier="nano" type="button" onClick={onClick} disabled={disabled}>
        ↺ regenerate
      </MidgardButton>
    </div>
  )
}

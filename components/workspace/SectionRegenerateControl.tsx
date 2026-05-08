'use client'

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
    <MidgardButton tier="nano" type="button" className={className} onClick={onClick} disabled={disabled}>
      ↺ regenerate
    </MidgardButton>
  )
}

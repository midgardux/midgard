'use client'

import { MidgardButton } from '@/components/workspace/MidgardButton'

interface SectionRegenerateControlProps {
  sectionId: string
  className?: string
}

export function SectionRegenerateControl({ className }: SectionRegenerateControlProps) {
  return (
    <MidgardButton tier="nano" type="button" className={className}>
      ↺ regenerate
    </MidgardButton>
  )
}

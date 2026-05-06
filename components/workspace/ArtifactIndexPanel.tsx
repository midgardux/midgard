'use client'

import { cn } from '@/lib/utils'
import type { Artifact } from '@/actions/projects'

interface ArtifactIndexPanelProps {
  artifacts: Artifact[]
  onSelect?: () => void
  className?: string
}

export function ArtifactIndexPanel({ className }: ArtifactIndexPanelProps) {
  return (
    <nav role="navigation" aria-label="Artifact navigation" className={cn('py-2', className)}>
      <p className="px-4 font-mono text-[11px] text-mg-foreground-subtle py-2">/flows /personas /ia /synthesis</p>
    </nav>
  )
}

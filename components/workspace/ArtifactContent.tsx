'use client'

import type { Artifact } from '@/actions/projects'

interface ArtifactContentProps {
  artifacts: Artifact[]
}

export function ArtifactContent({}: ArtifactContentProps) {
  return (
    <div className="px-6 py-6">
      <p className="font-mono text-[11px] text-mg-foreground-subtle">Artifact content (Story 5.3)</p>
    </div>
  )
}

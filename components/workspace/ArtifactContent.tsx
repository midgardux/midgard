'use client'

import type { Artifact } from '@/actions/projects'
import { useWorkspaceStore } from '@/stores/workspace'

interface ArtifactContentProps {
  artifacts: Artifact[]
}

export function ArtifactContent({}: ArtifactContentProps) {
  const activeArtifact = useWorkspaceStore((s) => s.activeArtifact)
  return (
    <div className="px-6 py-6">
      <p className="font-mono text-[11px] text-mg-foreground-subtle">/{activeArtifact} (Story 5.3)</p>
    </div>
  )
}

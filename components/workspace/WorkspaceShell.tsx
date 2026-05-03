'use client'

import { useEffect } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { BriefInputSurface } from '@/components/workspace/BriefInputSurface'

interface WorkspaceShellProps {
  projectId: string
  hasArtifacts: boolean
  projectName: string
}

export function WorkspaceShell({ projectId, hasArtifacts }: WorkspaceShellProps) {
  const phase = useWorkspaceStore((s) => s.phase)
  const setPhase = useWorkspaceStore((s) => s.setPhase)

  useEffect(() => {
    if (hasArtifacts) {
      setPhase('workspace')
    }
    return () => {
      setPhase('input')
    }
  }, [hasArtifacts, setPhase])

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="font-mono text-xs text-mg-foreground-muted">The Allfather works…</p>
      </div>
    )
  }

  if (phase === 'workspace') {
    return (
      <div className="font-mono text-xs text-mg-foreground-muted p-6">
        Artifacts ready. (Story 5.1)
      </div>
    )
  }

  return <BriefInputSurface projectId={projectId} />
}

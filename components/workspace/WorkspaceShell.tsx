'use client'

import { useEffect, useRef, useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { BriefInputSurface } from '@/components/workspace/BriefInputSurface'
import { AllFatherLoadingState } from '@/components/workspace/AllFatherLoadingState'
import { ArtifactWorkspace } from '@/components/workspace/ArtifactWorkspace'
import { cn } from '@/lib/utils'
import type { Artifact } from '@/actions/projects'

interface WorkspaceShellProps {
  projectId: string
  projectName: string
  artifacts: Artifact[]
}

export function WorkspaceShell({ projectId, artifacts }: WorkspaceShellProps) {
  const hasArtifacts = artifacts.length > 0
  const phase = useWorkspaceStore((s) => s.phase)
  const setPhase = useWorkspaceStore((s) => s.setPhase)

  const prevPhaseRef = useRef(phase)
  const [isFading, setIsFading] = useState(false)

  useEffect(() => {
    if (prevPhaseRef.current === 'loading' && phase === 'workspace') {
      setIsFading(true)
      const t = setTimeout(() => setIsFading(false), 300)
      prevPhaseRef.current = phase
      return () => clearTimeout(t)
    }
    prevPhaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (hasArtifacts) {
      setPhase('workspace')
    }
    return () => {
      setPhase('input')
    }
  }, [hasArtifacts, setPhase])

  if (phase === 'loading' || isFading) {
    return (
      <div className={cn('transition-opacity duration-300', isFading ? 'opacity-0' : 'opacity-100')}>
        <AllFatherLoadingState />
      </div>
    )
  }

  if (phase === 'workspace') {
    return <ArtifactWorkspace artifacts={artifacts} projectId={projectId} />
  }

  return <BriefInputSurface projectId={projectId} />
}

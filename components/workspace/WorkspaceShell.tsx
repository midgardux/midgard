'use client'

import { useEffect, useRef, useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { BriefInputSurface } from '@/components/workspace/BriefInputSurface'
import { AllFatherLoadingState } from '@/components/workspace/AllFatherLoadingState'
import { AttentionRegion } from '@/components/workspace/AttentionRegion'
import { MidgardButton } from '@/components/workspace/MidgardButton'
import { cn } from '@/lib/utils'

interface WorkspaceShellProps {
  projectId: string
  hasArtifacts: boolean
  projectName: string
}

export function WorkspaceShell({ projectId, hasArtifacts }: WorkspaceShellProps) {
  const phase = useWorkspaceStore((s) => s.phase)
  const setPhase = useWorkspaceStore((s) => s.setPhase)
  const showDisclosure = useWorkspaceStore((s) => s.showDisclosure)
  const setShowDisclosure = useWorkspaceStore((s) => s.setShowDisclosure)

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
    return (
      <div>
        {showDisclosure && (
          <div className="px-6 pt-4">
            <AttentionRegion variant="info" title="A note about your data">
              <p className="font-mono text-xs text-mg-foreground">
                Your input is processed by Anthropic&apos;s API and is not used to train models.
              </p>
              <div className="mt-3">
                <MidgardButton tier="ghost" type="button" onClick={() => setShowDisclosure(false)}>
                  Dismiss
                </MidgardButton>
              </div>
            </AttentionRegion>
          </div>
        )}
        <div className="font-mono text-xs text-mg-foreground-muted p-6">
          Artifacts ready. (Story 5.1)
        </div>
      </div>
    )
  }

  return <BriefInputSurface projectId={projectId} />
}

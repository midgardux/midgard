'use client'

import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { ArtifactIndexPanel } from '@/components/workspace/ArtifactIndexPanel'
import { ArtifactContent } from '@/components/workspace/ArtifactContent'
import { AttentionRegion } from '@/components/workspace/AttentionRegion'
import { MidgardButton } from '@/components/workspace/MidgardButton'
import { cn } from '@/lib/utils'
import type { Artifact } from '@/actions/projects'
import type { ArtifactType } from '@/types/artifacts'

const ARTIFACT_TYPES: ArtifactType[] = ['flows', 'personas', 'ia', 'synthesis']
const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  flows: '/flows',
  personas: '/personas',
  ia: '/ia',
  synthesis: '/synthesis',
}

interface ArtifactWorkspaceProps {
  artifacts: Artifact[]
}

export function ArtifactWorkspace({ artifacts }: ArtifactWorkspaceProps) {
  const showDisclosure = useWorkspaceStore((s) => s.showDisclosure)
  const setShowDisclosure = useWorkspaceStore((s) => s.setShowDisclosure)
  const activeArtifact = useWorkspaceStore((s) => s.activeArtifact)
  const setActiveArtifact = useWorkspaceStore((s) => s.setActiveArtifact)

  const [trayOpen, setTrayOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!trayOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTrayOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [trayOpen])

  return (
    <div className="flex flex-row h-[calc(100vh-92px)] overflow-hidden">
      {/* Desktop index panel */}
      <div
        className="flex-shrink-0 border-r border-mg-border overflow-y-auto tablet:hidden"
        style={{ width: 'var(--index-panel-width)' }}
      >
        <ArtifactIndexPanel artifacts={artifacts} />
      </div>

      {/* Tablet icon strip */}
      <div
        className="hidden tablet:flex mobile:hidden flex-col flex-shrink-0 border-r border-mg-border"
        style={{ width: 'var(--index-panel-collapsed)' }}
      >
        {ARTIFACT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => { setActiveArtifact(type); setTrayOpen(true) }}
            aria-label={ARTIFACT_LABELS[type]}
            aria-current={activeArtifact === type ? 'true' : undefined}
            className={cn(
              'h-11 w-full truncate font-mono text-[11px] cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-foreground-subtle',
              activeArtifact === type
                ? 'text-mg-accent'
                : 'text-mg-foreground-muted hover:text-mg-foreground'
            )}
          >
            {ARTIFACT_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Tablet overlay tray */}
      {trayOpen && (
        <>
          <div
            className="hidden tablet:block mobile:hidden fixed inset-0 z-20"
            onClick={() => setTrayOpen(false)}
          />
          <div
            className="hidden tablet:block mobile:hidden fixed z-30 overflow-y-auto bg-mg-surface border-r border-mg-border"
            style={{
              top: '92px',
              left: 'var(--index-panel-collapsed)',
              bottom: 0,
              width: 'var(--index-panel-width)',
            }}
          >
            <ArtifactIndexPanel artifacts={artifacts} onSelect={() => setTrayOpen(false)} />
          </div>
        </>
      )}

      {/* Content panel */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Mobile nav disclosure */}
        <div className="hidden mobile:block border-b border-mg-border flex-shrink-0">
          <button
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-artifact-nav"
            onClick={() => setMobileNavOpen((prev) => !prev)}
            className="h-11 w-full flex items-center px-4 font-mono text-[11px] text-mg-foreground-muted"
          >
            {ARTIFACT_LABELS[activeArtifact]}
          </button>
          {mobileNavOpen && (
            <div id="mobile-artifact-nav">
              <ArtifactIndexPanel artifacts={artifacts} onSelect={() => setMobileNavOpen(false)} />
            </div>
          )}
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
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
          <ArtifactContent artifacts={artifacts} />
        </div>
      </div>
    </div>
  )
}

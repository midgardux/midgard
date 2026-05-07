'use client'

import { useRef, useCallback } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { RoleFilterToggle } from '@/components/workspace/RoleFilterToggle'
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

interface ArtifactIndexPanelProps {
  artifacts: Artifact[]
  projectId: string
  onSelect?: () => void
  className?: string
}

export function ArtifactIndexPanel({ artifacts, projectId, onSelect, className }: ArtifactIndexPanelProps) {
  const activeArtifact = useWorkspaceStore((s) => s.activeArtifact)
  const setActiveArtifact = useWorkspaceStore((s) => s.setActiveArtifact)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        itemRefs.current[(index + 1) % ARTIFACT_TYPES.length]?.focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        itemRefs.current[(index - 1 + ARTIFACT_TYPES.length) % ARTIFACT_TYPES.length]?.focus()
      }
    },
    []
  )

  const handleSelect = useCallback(
    (type: ArtifactType) => {
      setActiveArtifact(type)
      onSelect?.()
    },
    [setActiveArtifact, onSelect]
  )

  return (
    <nav role="navigation" aria-label="Artifact sections" className={cn('flex flex-col', className)}>
      <div className="px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-mg-foreground-subtle">Artifacts</span>
        <span className="font-mono text-[10px] text-mg-foreground-subtle">{artifacts.length}</span>
      </div>
      <RoleFilterToggle artifacts={artifacts} projectId={projectId} />
      <ul role="list">
        {ARTIFACT_TYPES.map((type, index) => (
          <li key={type}>
            <button
              ref={(el) => { itemRefs.current[index] = el }}
              onClick={() => handleSelect(type)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              aria-current={activeArtifact === type ? 'page' : undefined}
              tabIndex={activeArtifact === type ? 0 : -1}
              className={cn(
                'w-full text-left px-4 h-10 font-mono text-[12px] flex items-center border-l-2 cursor-pointer hover:bg-mg-surface-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-mg-foreground-subtle transition-colors',
                activeArtifact === type
                  ? 'border-l-mg-accent text-mg-foreground'
                  : 'border-l-transparent text-mg-foreground-muted'
              )}
            >
              {ARTIFACT_LABELS[type]}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

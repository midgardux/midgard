'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores/workspace'
import { regenerateSection } from '@/actions/regeneration'
import { SectionRegenerateControl } from '@/components/workspace/SectionRegenerateControl'
import { AttentionRegion } from '@/components/workspace/AttentionRegion'
import { MidgardButton } from '@/components/workspace/MidgardButton'
import type { ArtifactSection as ArtifactSectionData, ArtifactType } from '@/types/artifacts'

interface ArtifactSectionProps {
  section: ArtifactSectionData
  pending?: boolean
  projectId: string
  artifactType: ArtifactType
}

export function ArtifactSection({ section, pending = false, projectId, artifactType }: ArtifactSectionProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [regenError, setRegenError] = useState<string | null>(null)
  const regeneratingSection = useWorkspaceStore((s) => s.regeneratingSection)
  const setRegeneratingSection = useWorkspaceStore((s) => s.setRegeneratingSection)
  const isRegenerating = regeneratingSection === section.id
  const isAnyRegenerating = regeneratingSection !== null

  const headingId = `section-heading-${section.id}`

  function handleRegenerate() {
    setRegenError(null)
    setRegeneratingSection(section.id)
    startTransition(async () => {
      const result = await regenerateSection(projectId, artifactType, section.id)
      if (!result.success) {
        setRegeneratingSection(null)
        setRegenError(result.error)
        return
      }
      setRegeneratingSection(null)
      router.refresh()
    })
  }

  return (
    <div
      className="group py-[22px] px-[28px] border-b border-mg-border last:border-b-0"
      role="region"
      aria-labelledby={headingId}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono text-[12px] text-mg-accent flex-shrink-0">
          {section.figureNumber}
        </span>
        <h3 id={headingId} className="font-mono text-[12px] text-mg-foreground flex-1">
          {section.title}
        </h3>
        <SectionRegenerateControl
          onClick={handleRegenerate}
          disabled={isAnyRegenerating || isPending}
          className={cn(
            'flex-shrink-0 transition-opacity duration-150',
            pending ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        />
      </div>
      {isRegenerating ? (
        <p className="font-mono text-[11px] text-mg-foreground-muted">regenerating...</p>
      ) : regenError ? (
        <div className="mt-2">
          <AttentionRegion variant="error" aria-label="Regeneration error">
            <p className="font-mono text-xs text-mg-foreground">Regeneration failed. Try again.</p>
            <div className="mt-3">
              <MidgardButton tier="ghost" onClick={handleRegenerate} disabled={isPending || isAnyRegenerating}>
                Try again
              </MidgardButton>
            </div>
          </AttentionRegion>
        </div>
      ) : pending ? (
        <p className="font-mono text-[11px] text-mg-foreground-subtle">Not yet written.</p>
      ) : (
        <p className="text-sm text-mg-foreground leading-relaxed whitespace-pre-wrap">
          {section.body}
        </p>
      )}
    </div>
  )
}

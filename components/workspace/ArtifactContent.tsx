'use client'

import { useWorkspaceStore } from '@/stores/workspace'
import { ArtifactSection } from '@/components/workspace/ArtifactSection'
import { MidgardButton } from '@/components/workspace/MidgardButton'
import type { Artifact } from '@/actions/projects'
import type { ArtifactContent as ArtifactContentData } from '@/types/artifacts'

interface ArtifactContentProps {
  artifacts: Artifact[]
  projectId: string
}

export function ArtifactContent({ artifacts, projectId }: ArtifactContentProps) {
  const activeArtifact = useWorkspaceStore((s) => s.activeArtifact)
  const activeRole = useWorkspaceStore((s) => s.activeRole)
  const setActiveRole = useWorkspaceStore((s) => s.setActiveRole)

  const artifact = artifacts.find((a) => a.artifact_type === activeArtifact)
  const artifactData = artifact?.content as ArtifactContentData | undefined

  if (!artifact || !artifactData) {
    return (
      <div className="px-[28px] py-[22px]">
        <p className="font-mono text-[11px] text-mg-foreground-subtle">No content available.</p>
      </div>
    )
  }

  const typeLabel = `/${activeArtifact}`
  const generatedAt = new Date(artifact.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const visibleSections = activeRole
    ? (artifactData.sections ?? []).filter((s) => s.roles?.includes(activeRole))
    : (artifactData.sections ?? [])

  return (
    <div>
      <div className="sticky top-0 z-10 bg-mg-background border-b border-mg-border px-[28px] py-4 flex items-baseline gap-4">
        <span className="font-mono text-[11px] text-mg-foreground-subtle">{typeLabel}</span>
        <h2 className="font-mono text-[13px] text-mg-foreground flex-1">{artifactData.title}</h2>
        <span className="font-mono text-[10px] text-mg-foreground-subtle flex-shrink-0">{generatedAt}</span>
      </div>
      {visibleSections.length === 0 ? (
        <div className="px-[28px] py-[22px] flex flex-col gap-3">
          <p className="font-mono text-[11px] text-mg-foreground-subtle">No sections match this role.</p>
          <MidgardButton tier="ghost" onClick={() => setActiveRole(null)}>Clear filter</MidgardButton>
        </div>
      ) : (
        <div>
          {visibleSections.map((section) => (
            <ArtifactSection
              key={section.id}
              section={section}
              pending={!section.body}
              projectId={projectId}
              artifactType={activeArtifact}
            />
          ))}
        </div>
      )}
    </div>
  )
}

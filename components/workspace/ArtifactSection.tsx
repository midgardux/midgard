'use client'

import { cn } from '@/lib/utils'
import { SectionRegenerateControl } from '@/components/workspace/SectionRegenerateControl'
import type { ArtifactSection as ArtifactSectionData } from '@/types/artifacts'

interface ArtifactSectionProps {
  section: ArtifactSectionData
  pending?: boolean
}

export function ArtifactSection({ section, pending = false }: ArtifactSectionProps) {
  const headingId = `section-heading-${section.id}`

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
          sectionId={section.id}
          className={cn(
            'flex-shrink-0 transition-opacity duration-150',
            pending ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        />
      </div>
      {pending ? (
        <p className="font-mono text-[11px] text-mg-foreground-subtle">Not yet written.</p>
      ) : (
        <p className="text-sm text-mg-foreground leading-relaxed whitespace-pre-wrap">
          {section.body}
        </p>
      )}
    </div>
  )
}

'use client'

import { useMemo, useEffect } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { cn } from '@/lib/utils'
import type { Artifact } from '@/actions/projects'
import type { ArtifactContent as ArtifactContentData } from '@/types/artifacts'

interface RoleFilterToggleProps {
  artifacts: Artifact[]
  projectId: string
  className?: string
}

export function RoleFilterToggle({ artifacts, projectId, className }: RoleFilterToggleProps) {
  const activeRole = useWorkspaceStore((s) => s.activeRole)
  const setActiveRole = useWorkspaceStore((s) => s.setActiveRole)

  const allRoles = useMemo(() => {
    const roleSet = new Set<string>()
    artifacts.forEach((artifact) => {
      const content = artifact.content as ArtifactContentData | undefined
      content?.sections?.forEach((section) => {
        section.roles?.forEach((role) => roleSet.add(role))
      })
    })
    return Array.from(roleSet).sort()
  }, [artifacts])

  useEffect(() => {
    setActiveRole(null)
  }, [projectId, setActiveRole])

  const chipClass = (isActive: boolean) =>
    cn(
      'font-mono text-[11px] px-2 py-0.5 border rounded cursor-pointer transition-colors',
      isActive
        ? 'border-mg-accent bg-mg-accent-surface text-mg-accent'
        : 'border-mg-border text-mg-foreground-subtle hover:border-mg-muted hover:text-mg-foreground-muted'
    )

  return (
    <div role="group" aria-label="Filter by role" className={cn('px-3 py-2 flex flex-wrap gap-1.5', className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={activeRole === null}
        onClick={() => setActiveRole(null)}
        className={chipClass(activeRole === null)}
      >
        All roles
      </button>
      {allRoles.map((role) => (
        <button
          key={role}
          type="button"
          role="checkbox"
          aria-checked={activeRole === role}
          onClick={() => setActiveRole(activeRole === role ? null : role)}
          className={chipClass(activeRole === role)}
        >
          {role}
        </button>
      ))}
    </div>
  )
}

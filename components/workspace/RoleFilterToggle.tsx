'use client'

import type { Artifact } from '@/actions/projects'
import { cn } from '@/lib/utils'

interface RoleFilterToggleProps {
  artifacts: Artifact[]
  className?: string
}

export function RoleFilterToggle({ className }: RoleFilterToggleProps) {
  return (
    <div className={cn('px-4 py-2', className)}>
      <p className="font-mono text-[11px] text-mg-foreground-subtle">role filter (Story 5.4)</p>
    </div>
  )
}

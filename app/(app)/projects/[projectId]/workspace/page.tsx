import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProject, getArtifacts } from '@/actions/projects'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

type Props = { params: Promise<{ projectId: string }> }

export default async function WorkspacePage({ params }: Props) {
  const { projectId } = await params

  const projectResult = await getProject(projectId)
  if (!projectResult.success || !projectResult.data) notFound()

  const project = projectResult.data

  const artifactsResult = await getArtifacts(projectId)
  const artifacts = artifactsResult.success ? artifactsResult.data : []

  return (
    <main>
      <div className="border-b border-mg-border px-6 py-3">
        <h1 className="font-sans text-mg-foreground font-medium text-sm">{project.name}</h1>
      </div>
      <div className="px-6 py-8">
        {artifacts.length === 0 ? (
          // Story 4.2 replaces this with <BriefInputSurface />
          <div className="flex items-center justify-center min-h-[50vh]">
            <p className="font-mono text-xs text-mg-foreground-muted">No artifacts yet.</p>
          </div>
        ) : (
          // Story 5.1 replaces this with <ArtifactWorkspace />
          <ul className="space-y-1">
            {artifacts.map((artifact) => (
              <li key={artifact.id} className="font-mono text-xs text-mg-foreground-muted">
                /{artifact.artifact_type || 'unknown'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

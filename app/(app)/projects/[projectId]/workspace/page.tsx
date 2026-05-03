import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProject, getArtifacts } from '@/actions/projects'
import { DeleteRealmButton } from '@/components/projects/DeleteRealmButton'
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell'

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
      <div className="border-b border-mg-border px-6 py-3 flex items-center justify-between">
        <h1 className="font-sans text-mg-foreground font-medium text-sm">{project.name}</h1>
        <DeleteRealmButton projectId={project.id} projectName={project.name} />
      </div>
      <WorkspaceShell
        projectId={project.id}
        projectName={project.name}
        hasArtifacts={artifacts.length > 0}
      />
    </main>
  )
}

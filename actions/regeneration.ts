'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { regenerateSingleSection } from '@/lib/claude/regenerate'
import type { ActionResult } from '@/types/actions'
import type { ArtifactContent, ArtifactSection, ArtifactType } from '@/types/artifacts'
import type { Json } from '@/lib/supabase/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_TYPES = ['flows', 'personas', 'ia', 'synthesis'] as const
const SECTION_ID_RE = /^[a-zA-Z0-9_\-.]{1,256}$/

export async function regenerateSection(
  projectId: string,
  artifactType: ArtifactType,
  sectionId: string
): Promise<ActionResult<ArtifactSection>> {
  if (!UUID_RE.test(projectId) || !VALID_TYPES.includes(artifactType) || !SECTION_ID_RE.test(sectionId ?? '')) {
    return { success: false, error: 'Invalid request.' }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Not authenticated.' }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()
  if (!project) return { success: false, error: 'Project not found.' }

  const { data: artifact, error: artifactError } = await supabase
    .from('artifacts')
    .select('id, content')
    .eq('project_id', projectId)
    .eq('artifact_type', artifactType)
    .single()
  if (artifactError || !artifact) return { success: false, error: 'Artifact not found.' }

  const currentContent = artifact.content as ArtifactContent
  if (!Array.isArray(currentContent?.sections)) {
    return { success: false, error: 'Artifact data is invalid.' }
  }

  const result = await regenerateSingleSection(artifactType, currentContent, sectionId)
  if (!result.success) return result

  const updatedSections = currentContent.sections.map((s) =>
    s.id === sectionId ? result.data.section : s
  )
  const updatedContent: ArtifactContent = { ...currentContent, sections: updatedSections }

  const { error: updateError } = await supabase
    .from('artifacts')
    .update({ content: updatedContent as unknown as Json, updated_at: new Date().toISOString() })
    .eq('id', artifact.id)
  if (updateError) return { success: false, error: 'Failed to save regenerated section.' }

  const tokenResult = await supabase.from('token_usage').insert({
    project_id: projectId,
    user_id: user.id,
    input_tokens: result.data.inputTokens,
    output_tokens: result.data.outputTokens,
  })
  if (tokenResult.error) {
    console.error('token_usage insert failed:', tokenResult.error)
  }

  revalidatePath(`/projects/${projectId}/workspace`)

  return { success: true, data: result.data.section }
}

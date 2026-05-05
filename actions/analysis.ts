'use server'

import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types/actions'
import type { Json } from '@/lib/supabase/types'
import { parseDocx } from '@/lib/parsers/docx'
import { parsePdf } from '@/lib/parsers/pdf'
import { assessBriefQuality } from '@/lib/claude/quality-gate'
import { analyzeBrief } from '@/lib/claude/analyze'
import { createServerClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'text/markdown',
  'text/plain',
  'text/x-markdown',
]

export type QualityGateChallenge = {
  questions: string[]
  attempt: number
}

export async function submitBrief(
  projectId: string,
  formData: FormData
): Promise<ActionResult<{ briefText: string; qualityGate?: QualityGateChallenge }>> {
  if (!projectId?.trim()) return { success: false, error: 'Invalid project.' }

  const text = ((formData.get('text') as string | null) ?? '').trim()
  const file = formData.get('file') as File | null
  const attempt = parseInt((formData.get('attempt') as string | null) ?? '0', 10)
  if (isNaN(attempt)) return { success: false, error: 'Invalid request.' }

  let briefText: string

  if (file && file.size > 0) {
    if (file.size > MAX_FILE_SIZE) return { success: false, error: 'File must be under 5 MB.' }
    if (!file.type || !ALLOWED_MIME_TYPES.includes(file.type)) {
      return { success: false, error: 'Unsupported file type. Use .docx, .pdf, .md, or .txt.' }
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    let fileText: string

    if (ext === 'docx') {
      const buffer = Buffer.from(await file.arrayBuffer())
      const parsed = await parseDocx(buffer)
      if (!parsed.success) return parsed
      fileText = parsed.data
    } else if (ext === 'pdf') {
      const buffer = Buffer.from(await file.arrayBuffer())
      const parsed = await parsePdf(buffer)
      if (!parsed.success) return parsed
      fileText = parsed.data
    } else {
      fileText = (await file.text()).trim()
    }

    briefText = text ? `${fileText}\n\n---\n\n${text}` : fileText
  } else {
    briefText = text
  }

  if (!briefText) return { success: false, error: 'Brief text is required.' }

  if (attempt < 1) {
    const gateResult = await assessBriefQuality(briefText)
    if (!gateResult.success) return gateResult
    if (!gateResult.data.passes) {
      return {
        success: true,
        data: { briefText, qualityGate: { questions: gateResult.data.questions, attempt: 0 } },
      }
    }
  }

  return { success: true, data: { briefText } }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_BRIEF_LENGTH = 50_000

export async function runAnalysis(
  projectId: string,
  briefText: string
): Promise<ActionResult<{ showDisclosure: boolean }>> {
  if (!projectId?.trim() || !briefText?.trim()) return { success: false, error: 'Invalid request.' }
  if (!UUID_RE.test(projectId)) return { success: false, error: 'Invalid request.' }
  if (briefText.length > MAX_BRIEF_LENGTH)
    return { success: false, error: 'Your brief is too long to analyze. Please shorten it and try again.' }

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('has_seen_disclosure')
    .eq('id', user.id)
    .single()
  const hadSeenDisclosure = profile?.has_seen_disclosure ?? false

  const result = await analyzeBrief(briefText)
  if (!result.success) return result

  // Fetch existing artifacts as rollback reference in case inserts fail
  const { data: existingArtifacts, error: existingError } = await supabase
    .from('artifacts')
    .select('artifact_type, content')
    .eq('project_id', projectId)

  if (existingError) {
    console.error('artifact select before delete failed:', existingError)
    return { success: false, error: 'Failed to save artifacts. Please try again.' }
  }

  await supabase.from('artifacts').delete().eq('project_id', projectId)

  const insertResults = await Promise.all(
    (['personas', 'flows', 'ia', 'synthesis'] as const).map((artifactType) =>
      supabase.from('artifacts').insert({
        project_id: projectId,
        artifact_type: artifactType,
        content: result.data[artifactType] as unknown as Json,
      })
    )
  )

  if (insertResults.some((r) => r.error)) {
    if (existingArtifacts?.length) {
      const rollbackResults = await Promise.all(
        existingArtifacts.map((a) =>
          supabase.from('artifacts').insert({
            project_id: projectId,
            artifact_type: a.artifact_type,
            content: a.content,
          })
        )
      )
      if (rollbackResults.some((r) => r.error)) {
        console.error('artifact rollback failed — project may have lost artifacts:', projectId)
      }
    }
    return { success: false, error: 'Failed to save artifacts. Please try again.' }
  }

  const tokenResult = await supabase.from('token_usage').insert({
    project_id: projectId,
    user_id: user.id,
    input_tokens: result.data.totalInputTokens,
    output_tokens: result.data.totalOutputTokens,
  })
  if (tokenResult.error) {
    console.error('token_usage insert failed:', tokenResult.error)
  }

  if (!hadSeenDisclosure) {
    const disclosureResult = await supabase
      .from('profiles')
      .update({ has_seen_disclosure: true })
      .eq('id', user.id)
    if (disclosureResult.error) {
      console.error('has_seen_disclosure update failed:', disclosureResult.error)
    }
  }

  revalidatePath(`/projects/${projectId}/workspace`)

  return { success: true, data: { showDisclosure: !hadSeenDisclosure } }
}

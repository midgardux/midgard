'use server'

import type { ActionResult } from '@/types/actions'
import { parseDocx } from '@/lib/parsers/docx'
import { parsePdf } from '@/lib/parsers/pdf'
import { assessBriefQuality } from '@/lib/claude/quality-gate'

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
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
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

  // Story 4.5 adds: AI analysis pipeline, artifact storage, token tracking
  return { success: true, data: { briefText } }
}

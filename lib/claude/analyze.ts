import { getClaudeClient } from '@/lib/claude/client'
import { PERSONAS_SYSTEM_PROMPT } from '@/lib/claude/prompts/personas'
import { FLOWS_SYSTEM_PROMPT } from '@/lib/claude/prompts/flows'
import { IA_SYSTEM_PROMPT } from '@/lib/claude/prompts/ia'
import { SYNTHESIS_SYSTEM_PROMPT } from '@/lib/claude/prompts/synthesis'
import type { ActionResult } from '@/types/actions'
import type { ArtifactContent, AnalyzedArtifacts } from '@/types/artifacts'

const ANALYSIS_MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 4000
const ANALYSIS_ERROR = 'Generation failed. Your brief was saved. Try again.'

function parseArtifactResponse(raw: string): ArtifactContent | null {
  let text = raw.trim()
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch) {
    text = fenceMatch[1].trim()
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
  const p = parsed as Record<string, unknown>
  if (typeof p.title !== 'string' || !Array.isArray(p.sections) || p.sections.length === 0) return null
  const sections = p.sections as unknown[]
  for (const s of sections) {
    if (typeof s !== 'object' || s === null) return null
    const sec = s as Record<string, unknown>
    if (
      typeof sec.id !== 'string' ||
      typeof sec.figureNumber !== 'string' ||
      typeof sec.title !== 'string' ||
      typeof sec.body !== 'string' ||
      !Array.isArray(sec.roles) ||
      !sec.roles.every((r) => typeof r === 'string')
    )
      return null
  }
  return parsed as ArtifactContent
}

export async function analyzeBrief(briefText: string): Promise<ActionResult<AnalyzedArtifacts>> {
  try {
    const client = getClaudeClient()
    const prompts = [
      { system: PERSONAS_SYSTEM_PROMPT },
      { system: FLOWS_SYSTEM_PROMPT },
      { system: IA_SYSTEM_PROMPT },
      { system: SYNTHESIS_SYSTEM_PROMPT },
    ]

    const responses = await Promise.all(
      prompts.map(({ system }) =>
        client.messages.create({
          model: ANALYSIS_MODEL,
          max_tokens: MAX_TOKENS,
          system,
          messages: [{ role: 'user', content: briefText }],
        })
      )
    )

    const parsed = responses.map((r) => {
      const raw = r.content[0]?.type === 'text' ? r.content[0].text : ''
      return parseArtifactResponse(raw)
    })

    if (parsed.some((p) => p === null)) {
      return { success: false, error: ANALYSIS_ERROR }
    }

    const [personas, flows, ia, synthesis] = parsed as ArtifactContent[]
    const totalInputTokens = responses.reduce((sum, r) => sum + r.usage.input_tokens, 0)
    const totalOutputTokens = responses.reduce((sum, r) => sum + r.usage.output_tokens, 0)

    return { success: true, data: { personas, flows, ia, synthesis, totalInputTokens, totalOutputTokens } }
  } catch (err) {
    console.error('analyzeBrief failed:', err)
    return { success: false, error: ANALYSIS_ERROR }
  }
}

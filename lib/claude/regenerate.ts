import { getClaudeClient } from '@/lib/claude/client'
import type { ActionResult } from '@/types/actions'
import type { ArtifactContent, ArtifactSection, ArtifactType } from '@/types/artifacts'

const REGENERATION_MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 1000
const REGENERATION_ERROR = 'Regeneration failed. Try again.'

const REGENERATION_SYSTEM_PROMPT = `You are a UX analysis assistant. You will be given an existing UX artifact and asked to regenerate one specific section.

Keep the same id, figureNumber, title, and roles as the original section. Generate fresh, improved body content that is consistent with the other sections in the artifact.

Respond with valid JSON only — no prose, no markdown, no code fences. Schema:
{
  "id": "<same as original>",
  "figureNumber": "<same as original>",
  "title": "<same as original>",
  "body": "<regenerated body content>",
  "roles": ["<same roles as original>"]
}`

function parseRegeneratedSection(raw: string, originalSection: ArtifactSection): ArtifactSection | null {
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

  if (
    typeof p.id !== 'string' ||
    typeof p.figureNumber !== 'string' ||
    typeof p.title !== 'string' ||
    typeof p.body !== 'string' ||
    !p.body.trim() ||
    !Array.isArray(p.roles) ||
    !p.roles.every((r) => typeof r === 'string')
  ) {
    return null
  }

  // Enforce that identity fields match the original — don't let Claude change them
  return {
    id: originalSection.id,
    figureNumber: originalSection.figureNumber,
    title: originalSection.title,
    body: p.body,
    roles: originalSection.roles,
  }
}

export async function regenerateSingleSection(
  artifactType: ArtifactType,
  currentContent: ArtifactContent,
  sectionId: string
): Promise<ActionResult<{ section: ArtifactSection; inputTokens: number; outputTokens: number }>> {
  try {
    const section = currentContent.sections.find((s) => s.id === sectionId)
    if (!section) return { success: false, error: REGENERATION_ERROR }

    const client = getClaudeClient()
    const userMessage = `Artifact type: ${artifactType}\n\nFull artifact:\n${JSON.stringify(currentContent)}\n\nRegenerate section id "${sectionId}" (title: "${section.title}"). Keep the same id, figureNumber, title, and roles. Generate a fresh body.`

    const response = await client.messages.create({
      model: REGENERATION_MODEL,
      max_tokens: MAX_TOKENS,
      system: REGENERATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    if (response.stop_reason !== 'end_turn') return { success: false, error: REGENERATION_ERROR }
    const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const parsed = parseRegeneratedSection(raw, section)
    if (!parsed) return { success: false, error: REGENERATION_ERROR }

    return {
      success: true,
      data: {
        section: parsed,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    }
  } catch (err) {
    console.error('regenerateSingleSection failed:', err)
    return { success: false, error: REGENERATION_ERROR }
  }
}

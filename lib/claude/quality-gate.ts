import { getClaudeClient } from '@/lib/claude/client'
import type { ActionResult } from '@/types/actions'

export type QualityGateAssessment = {
  passes: boolean
  questions: string[]
}

const SYSTEM_PROMPT = `You are assessing whether a product brief contains enough information to generate meaningful UX artifacts.

A brief is SUFFICIENT if it includes all three:
1. A target user role (who will use this product, e.g. "freelance designer", "small business owner")
2. A primary problem or goal (what they need to accomplish or what pain they have)
3. A product context (what type of product or domain this is, e.g. "mobile invoicing app", "B2B SaaS dashboard")

Respond with valid JSON only — no prose, no markdown, no code fences. Schema:
{
  "passes": boolean,
  "questions": string[]
}

Rules:
- "passes": true if all three elements are present; false otherwise
- "questions": empty array when passes is true; 1-2 targeted questions when false
- Questions must be specific to what is missing — do not ask generically
- Each question must be answerable in 1-2 sentences
- Do not ask about things already mentioned in the brief`

export async function assessBriefQuality(
  briefText: string
): Promise<ActionResult<QualityGateAssessment>> {
  try {
    const client = getClaudeClient()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: briefText }],
    })

    const raw =
      response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
    // Strip markdown code fences if the model wraps its response despite instructions
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      return { success: false, error: 'Quality assessment failed.' }
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).passes !== 'boolean' ||
      !Array.isArray((parsed as Record<string, unknown>).questions)
    ) {
      return { success: false, error: 'Quality assessment failed.' }
    }

    const assessment = parsed as { passes: boolean; questions: unknown[] }
    const questions = assessment.questions
      .filter((q): q is string => typeof q === 'string')
      .slice(0, 2)

    if (!assessment.passes && questions.length === 0) {
      return { success: false, error: 'Quality assessment failed.' }
    }

    return { success: true, data: { passes: assessment.passes, questions } }
  } catch {
    return { success: false, error: 'Quality assessment failed.' }
  }
}

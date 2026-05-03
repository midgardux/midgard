import mammoth from 'mammoth'
import type { ActionResult } from '@/types/actions'

export async function parseDocx(buffer: Buffer): Promise<ActionResult<string>> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value.trim()
    if (!text) return { success: false, error: 'The document contains no extractable text.' }
    return { success: true, data: text }
  } catch {
    return { success: false, error: 'Could not read file.' }
  }
}

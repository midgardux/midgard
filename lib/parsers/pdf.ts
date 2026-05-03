import { PDFParse } from 'pdf-parse'
import type { ActionResult } from '@/types/actions'

export async function parsePdf(buffer: Buffer): Promise<ActionResult<string>> {
  try {
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    const text = (result.text ?? '').trim()
    if (!text) return { success: false, error: 'The document contains no extractable text.' }
    return { success: true, data: text }
  } catch {
    return { success: false, error: 'Could not read file.' }
  }
}

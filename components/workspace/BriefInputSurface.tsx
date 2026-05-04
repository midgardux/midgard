'use client'

import { useRef, useState, useTransition } from 'react'
import { submitBrief } from '@/actions/analysis'
import { useWorkspaceStore } from '@/stores/workspace'
import { MidgardButton } from '@/components/workspace/MidgardButton'
import { AttentionRegion } from '@/components/workspace/AttentionRegion'
import { cn } from '@/lib/utils'

const ALLOWED_EXTENSIONS = ['docx', 'pdf', 'md', 'txt']

function getExt(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

export function BriefInputSurface({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition()
  const setPhase = useWorkspaceStore((s) => s.setPhase)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [briefText, setBriefText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qualityGateState, setQualityGateState] = useState<{
    questions: string[]
    answers: string
    attempt: number
  } | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isPending) return
    setError(null)
    setQualityGateState(null)

    const formData = new FormData()
    formData.append('text', briefText.trim())
    formData.append('attempt', '0')
    if (selectedFile) formData.append('file', selectedFile)

    startTransition(async () => {
      try {
        const result = await submitBrief(projectId, formData)
        if (!result.success) {
          setError(result.error)
          return
        }
        if (result.data.qualityGate) {
          setQualityGateState({
            questions: result.data.qualityGate.questions,
            answers: '',
            attempt: result.data.qualityGate.attempt,
          })
          return
        }
        setPhase('loading')
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  function handleQualityGateSubmit() {
    if (isPending || !qualityGateState) return
    setError(null)
    const enrichedText = `${briefText.trim()}\n\n${qualityGateState.answers.trim()}`

    const formData = new FormData()
    formData.append('text', enrichedText)
    formData.append('attempt', '1')
    if (selectedFile) formData.append('file', selectedFile)

    setQualityGateState(null)

    startTransition(async () => {
      try {
        const result = await submitBrief(projectId, formData)
        if (!result.success) {
          setError(result.error)
          return
        }
        setPhase('loading')
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  function handleFileSelect(file: File | undefined) {
    if (!file) return
    const ext = getExt(file.name)
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError('Unsupported file type. Use .docx, .pdf, .md, or .txt.')
      return
    }
    setError(null)
    setSelectedFile(file)
  }

  return (
    <div className="max-w-[580px] mx-auto py-12 px-4">
      <form onSubmit={handleSubmit}>
        <p className="font-mono text-[10px] uppercase tracking-widest text-mg-foreground-subtle mb-2">
          Product Brief
        </p>

        <div
          className={cn(
            'border border-mg-border transition-colors',
            isDragOver && 'border-mg-foreground-subtle'
          )}
          onDragOver={(e) => { e.preventDefault(); if (!isPending) setIsDragOver(true) }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false) }}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragOver(false)
            if (isPending) return
            if (e.dataTransfer.files.length > 1) {
              setError('Drop one file at a time.')
              return
            }
            const file = e.dataTransfer.files[0]
            if (!file) return
            const ext = getExt(file.name)
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
              setError('Unsupported file type. Use .docx, .pdf, .md, or .txt.')
              return
            }
            setError(null)
            setSelectedFile(file)
          }}
        >
          <textarea
            className="font-mono text-[13px] bg-mg-surface text-mg-foreground placeholder:text-mg-foreground-subtle border-0 w-full min-h-[160px] resize-y p-4 focus:outline-none disabled:opacity-50 rounded-none"
            placeholder="Describe your product to the Allfather."
            value={briefText}
            onChange={(e) => setBriefText(e.target.value)}
            disabled={isPending && !qualityGateState}
          />
        </div>

        {selectedFile && (
          <div className="flex items-center gap-1 font-mono text-xs text-mg-foreground-muted mt-2">
            <span>{selectedFile.name}</span>
            <MidgardButton
              tier="nano"
              type="button"
              onClick={() => setSelectedFile(null)}
              aria-label="Remove file"
            >
              ×
            </MidgardButton>
          </div>
        )}

        {selectedFile && briefText.trim() && (
          <p className="font-mono text-[10px] text-mg-foreground-muted mt-1">
            File and text will both be submitted.
          </p>
        )}

        {error && (
          <div className="mt-3">
            <AttentionRegion variant="error" title="Something went wrong">
              <p className="font-mono text-xs text-mg-foreground">{error}</p>
            </AttentionRegion>
          </div>
        )}

        <div className="flex items-center gap-3 mt-4">
          <MidgardButton
            tier="primary"
            type="submit"
            disabled={isPending || (!briefText.trim() && !selectedFile)}
          >
            INVOKE THE ALLFATHER
          </MidgardButton>

          <MidgardButton
            tier="ghost"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
          >
            Upload brief
          </MidgardButton>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.pdf,.md,.txt"
            className="sr-only"
            onClick={(e) => { (e.target as HTMLInputElement).value = '' }}
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />
        </div>
      </form>

      {qualityGateState && (
        <div className="mt-3">
          <AttentionRegion
            variant="info"
            title="The Allfather needs more context."
            trapFocus={true}
            aria-label="Quality gate — additional context required"
          >
            {qualityGateState.questions.map((q, i) => (
              <p key={i} className="font-mono text-xs text-mg-foreground mb-3">{q}</p>
            ))}
            <textarea
              className="font-mono text-[13px] bg-mg-surface text-mg-foreground placeholder:text-mg-foreground-subtle border border-mg-border w-full min-h-[80px] resize-y p-3 focus:outline-none focus:border-mg-foreground-subtle disabled:opacity-50 rounded-none mt-1"
              placeholder="Answer here…"
              aria-label="Your answers to the questions above"
              value={qualityGateState.answers}
              onChange={(e) =>
                setQualityGateState((s) => (s ? { ...s, answers: e.target.value } : null))
              }
              disabled={isPending}
            />
            <div className="flex items-center gap-3 mt-3">
              <MidgardButton
                tier="primary"
                type="button"
                disabled={isPending || !qualityGateState.answers.trim()}
                onClick={handleQualityGateSubmit}
              >
                CONTINUE
              </MidgardButton>
            </div>
          </AttentionRegion>
        </div>
      )}
    </div>
  )
}

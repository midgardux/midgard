'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProject } from '@/actions/projects'
import { AttentionRegion } from '@/components/workspace/AttentionRegion'

interface DeleteRealmButtonProps {
  projectId: string
  projectName: string
}

type Status = 'idle' | 'confirming' | 'deleting' | 'error'

export function DeleteRealmButton({ projectId, projectName }: DeleteRealmButtonProps) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inFlight = useRef(false)

  async function handleConfirm() {
    if (inFlight.current) return
    inFlight.current = true
    setStatus('deleting')
    const result = await deleteProject(projectId)
    inFlight.current = false
    if (!result.success) {
      setErrorMsg(result.error)
      setStatus('error')
      return
    }
    router.push('/projects')
  }

  function handleCancel() {
    setStatus('idle')
    setErrorMsg(null)
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setStatus('confirming')}
        disabled={status !== 'idle'}
        className="border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Delete
      </button>

      {status === 'confirming' && (
        <AttentionRegion
          variant="confirm"
          aria-label="Confirm Realm deletion"
          className="mt-2"
        >
          <p className="font-sans text-sm text-mg-foreground-muted leading-relaxed mb-4">
            This will permanently delete &apos;{projectName}&apos; and all its runes. This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              className="border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors"
            >
              Delete forever
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </AttentionRegion>
      )}

      {status === 'deleting' && (
        <p className="font-mono text-xs text-mg-foreground-muted mt-2">Deleting...</p>
      )}

      {status === 'error' && (
        <AttentionRegion
          variant="error"
          className="mt-2"
        >
          <p className="font-sans text-sm text-mg-foreground-muted leading-relaxed mb-3">
            {errorMsg ?? 'Deletion failed. Please try again.'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              className="border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </AttentionRegion>
      )}
    </div>
  )
}

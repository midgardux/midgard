'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProject } from '@/actions/projects'
import { createCheckoutSession } from '@/actions/subscription'

interface NewRealmFormProps {
  variant: 'header' | 'empty-state'
}

interface UpgradePromptProps {
  realmCount: number
  onReset: () => void
}

function UpgradePrompt({ realmCount, onReset }: UpgradePromptProps) {
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)

  async function handleUpgrade() {
    if (isUpgrading) return
    setIsUpgrading(true)
    setUpgradeError(null)
    try {
      const result = await createCheckoutSession()
      if (!result.success) {
        setUpgradeError(result.error)
        setIsUpgrading(false)
        return
      }
      window.location.assign(result.data.url)
      // Don't reset isUpgrading — browser is navigating away
    } catch {
      setIsUpgrading(false)
      setUpgradeError('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="border border-mg-border px-7 py-6 mt-2">
      <p className="font-mono text-xs text-mg-foreground uppercase tracking-widest mb-3">
        Realm limit reached
      </p>
      <p className="font-sans text-sm text-mg-foreground-muted leading-relaxed mb-4">
        You&apos;ve built {realmCount} {realmCount === 1 ? 'Realm' : 'Realms'}. Upgrade to Pro for
        unlimited Realms, priority analysis, and no usage caps.
      </p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={isUpgrading}
          className="bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {isUpgrading ? 'Redirecting...' : 'Upgrade to Pro'}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="font-mono text-xs text-mg-foreground-subtle hover:text-mg-foreground transition-colors"
        >
          Try again
        </button>
      </div>
      {upgradeError && (
        <p className="font-mono text-xs text-mg-destructive mt-2">{upgradeError}</p>
      )}
    </div>
  )
}

export function NewRealmForm({ variant }: NewRealmFormProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [capReachedCount, setCapReachedCount] = useState<number | null>(null)

  const buttonLabel = variant === 'empty-state' ? 'Create your first Realm' : 'New Realm'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isLoading) return
    if (!name.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await createProject(name)
      if (!result.success) {
        setIsLoading(false)
        if (result.error.startsWith('PROJECT_CAP_REACHED')) {
          const count = parseInt(result.error.split(':')[1] ?? '0', 10)
          setCapReachedCount(isNaN(count) ? 0 : count)
          setIsOpen(false)
        } else {
          setError(result.error)
        }
        return
      }
      setIsLoading(false)
      router.push(`/projects/${result.data.id}/workspace`)
    } catch {
      setIsLoading(false)
      setError('Something went wrong. Please try again.')
    }
  }

  function handleCancel() {
    setIsOpen(false)
    setName('')
    setError(null)
    setIsLoading(false)
  }

  if (capReachedCount !== null) {
    return (
      <UpgradePrompt
        realmCount={capReachedCount}
        onReset={() => setCapReachedCount(null)}
      />
    )
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2 hover:opacity-90 transition-opacity"
      >
        {buttonLabel}
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-2${variant === 'header' ? ' w-64' : ' mt-2'}`}
    >
      <div>
        <label
          htmlFor="realm-name"
          className="block font-mono text-xs text-mg-foreground-muted uppercase tracking-widest mb-1"
        >
          Realm name
        </label>
        <input
          id="realm-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name your Realm"
          autoFocus
          maxLength={100}
          className="w-full bg-mg-surface border border-mg-border font-mono text-xs text-mg-foreground px-3 py-2 focus:outline-none focus:border-mg-foreground-subtle"
        />
        {error && (
          <p className="font-mono text-xs text-mg-destructive mt-1">{error}</p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {isLoading ? 'Creating...' : 'Create Realm'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

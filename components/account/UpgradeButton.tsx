'use client'

import { useState } from 'react'
import { createCheckoutSession } from '@/actions/subscription'

export function UpgradeButton() {
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
    } catch {
      setIsUpgrading(false)
      setUpgradeError('Something went wrong. Please try again.')
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={isUpgrading}
        className="bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isUpgrading ? 'Redirecting...' : 'Upgrade to Pro'}
      </button>
      {upgradeError && (
        <p role="alert" className="font-mono text-xs text-mg-destructive mt-2">{upgradeError}</p>
      )}
    </div>
  )
}

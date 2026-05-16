'use client'

import { useState } from 'react'
import { createPortalSession } from '@/actions/subscription'

export function ManageSubscriptionButton() {
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  async function handleManage() {
    if (isRedirecting) return
    setIsRedirecting(true)
    setPortalError(null)
    try {
      const result = await createPortalSession()
      if (!result.success) {
        setPortalError(result.error)
        setIsRedirecting(false)
        return
      }
      window.location.assign(result.data.url)
    } catch {
      setIsRedirecting(false)
      setPortalError('Something went wrong. Please try again.')
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleManage}
        disabled={isRedirecting}
        className="border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isRedirecting ? 'Redirecting...' : 'Manage subscription'}
      </button>
      {portalError && (
        <p role="alert" className="font-mono text-xs text-mg-destructive mt-2">{portalError}</p>
      )}
    </div>
  )
}

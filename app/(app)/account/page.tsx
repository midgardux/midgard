import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { ManageSubscriptionButton } from '@/components/account/ManageSubscriptionButton'
import { UpgradeButton } from '@/components/account/UpgradeButton'

export const metadata: Metadata = {
  title: 'Account — Midgard',
  robots: { index: false, follow: false },
}

function AccountSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <section>
        <div className="h-3 w-8 bg-mg-border rounded mb-2" />
        <div className="h-3 w-12 bg-mg-border rounded" />
      </section>
      <section>
        <div className="h-7 w-32 bg-mg-border rounded" />
      </section>
    </div>
  )
}

async function AccountContent() {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return <p className="font-mono text-xs text-mg-destructive">Failed to load account.</p>
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return <p className="font-mono text-xs text-mg-destructive">Failed to load account.</p>
    }

    return (
      <div className="space-y-8">
        <section>
          <p className="font-mono text-xs text-mg-foreground-muted mb-2">Plan</p>
          <p
            className={`font-mono text-xs uppercase tracking-widest ${
              profile.subscription_tier === 'pro' ? 'text-mg-accent' : 'text-mg-foreground-muted'
            }`}
          >
            {profile.subscription_tier === 'pro' ? 'Pro' : 'Free'}
          </p>
        </section>

        <section>
          {profile.subscription_tier === 'pro' ? (
            <ManageSubscriptionButton />
          ) : (
            <div className="space-y-2">
              <p className="font-sans text-sm text-mg-foreground-subtle">
                Upgrade to Pro for unlimited Realms.
              </p>
              <UpgradeButton />
            </div>
          )}
        </section>
      </div>
    )
  } catch {
    return <p className="font-mono text-xs text-mg-destructive">Failed to load account.</p>
  }
}

export default function AccountPage() {
  return (
    <main className="px-6 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <span className="font-mono text-xs uppercase tracking-widest text-mg-foreground-muted">
          Account
        </span>
        <Link
          href="/projects"
          className="font-mono text-xs text-mg-foreground-subtle hover:text-mg-foreground transition-colors"
        >
          ← Realms
        </Link>
      </div>
      <Suspense fallback={<AccountSkeleton />}>
        <AccountContent />
      </Suspense>
    </main>
  )
}

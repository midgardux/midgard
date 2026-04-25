import type { Metadata } from 'next'
import Link from 'next/link'
import { listProjects } from '@/actions/projects'

export const metadata: Metadata = {
  title: 'Realms — Midgard',
  robots: { index: false, follow: false },
}

const realmDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export default async function ProjectsPage() {
  const result = await listProjects()

  if (!result.success) {
    return (
      <main className="px-6 py-8 max-w-4xl mx-auto">
        <p className="font-mono text-xs text-mg-destructive mt-4">Failed to load Realms.</p>
      </main>
    )
  }

  const realms = result.data
  const isEmpty = realms.length === 0

  return (
    <main className="px-6 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-mg-foreground-muted">
          Realms
        </span>
        {!isEmpty && (
          <button
            disabled
            aria-disabled="true"
            aria-label="New Realm — available in next update"
            className="bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            New Realm
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className="mt-16 flex flex-col items-center gap-4">
          <p className="font-sans text-mg-foreground-muted">Your first Realm awaits.</p>
          <button
            disabled
            aria-disabled="true"
            aria-label="Create your first Realm — available in next update"
            className="bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create your first Realm
          </button>
        </div>
      ) : (
        <ul className="space-y-2 mt-6">
          {realms.map((realm) => (
            <li key={realm.id}>
              <Link href={`/projects/${realm.id}/workspace`}>
                <div className="border border-mg-border bg-mg-surface hover:bg-mg-surface-elevated p-4 transition-colors">
                  <p className="font-sans text-mg-foreground font-medium">{realm.name}</p>
                  <p className="font-mono text-xs text-mg-foreground-subtle mt-1">
                    {realmDateFormatter.format(new Date(realm.created_at))}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

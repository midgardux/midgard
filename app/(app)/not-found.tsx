import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="px-6 py-8 max-w-4xl mx-auto">
      <p className="font-mono text-xs uppercase tracking-widest text-mg-foreground-muted mt-8">
        Realm not found.
      </p>
      <Link
        href="/projects"
        className="inline-block mt-4 border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors"
      >
        Back to Realms
      </Link>
    </main>
  )
}

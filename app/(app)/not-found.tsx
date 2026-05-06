import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center gap-4 px-6 py-12">
      <p className="font-mono text-xs text-mg-foreground-muted">Not found.</p>
      <Link
        href="/projects"
        className="inline-block py-1 font-mono text-xs text-mg-foreground-subtle hover:text-mg-foreground transition-colors"
      >
        ← Back to Realms
      </Link>
    </main>
  )
}
